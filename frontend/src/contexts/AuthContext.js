import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import config from '../utils/config';

const AuthContext = createContext();

const API_URL = config.authApiUrl;
const USER_API_URL = config.apiUrl;

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const MAX_REFRESH_ATTEMPTS = 3;
  const navigate = useNavigate();

  const clearAuthState = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setUserRole(null);
    setIsAuthenticated(false);
    setJustLoggedIn(false);
    setRefreshAttempts(0);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isAuthenticated && token) {
        await axios.post(`${API_URL}/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthState();
      navigate('/login');
    }
  }, [isAuthenticated, token, clearAuthState, navigate]);

  const refreshTokenFn = useCallback(async () => {
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      console.warn('Max refresh attempts reached');
      return false;
    }

    try {
      if (!refreshToken) {
        console.warn('No refresh token available');
        return false;
      }

      console.log('Attempting token refresh');
      setRefreshAttempts(prev => prev + 1);
      const response = await axios.post(`${API_URL}/refresh-token`, { refreshToken });
      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;

      if (!newToken || !newRefreshToken || !user) {
        console.error('Invalid refresh response:', response.data);
        return false;
      }

      setToken(newToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      console.log('Token refreshed successfully');

        setCurrentUser(user);
        setUserRole(user.role || 'student');
        setIsAuthenticated(true);
      setRefreshAttempts(0); // Reset on success
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.warn('Invalid refresh token, clearing session');
        clearAuthState();
        navigate('/login');
      }
      return false;
    }
  }, [refreshToken, refreshAttempts, MAX_REFRESH_ATTEMPTS, clearAuthState, navigate]);

  const login = useCallback(async (user, token, refreshToken) => {
    try {
      if (!user || typeof user !== 'object' || !user.email) {
        throw new Error('Invalid user data');
      }
      if (!token || !refreshToken) {
        throw new Error('Token or refresh token missing');
      }
      console.log('Login with user:', { email: user.email, role: user.role });

      setToken(token);
      setRefreshToken(refreshToken);
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setCurrentUser(user);
      setUserRole(user.role || 'student');
      setIsAuthenticated(true);
      setJustLoggedIn(true);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await axios.post(`${USER_API_URL}/update-location`, {
                coordinates: [longitude, latitude],
                locationSharing: true
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              console.log('Location updated successfully');
            } catch (err) {
              console.error('Failed to update location:', err);
            }
          },
          (error) => {
            console.warn('Location permission denied:', error);
          }
        );
      }

      setTimeout(() => setJustLoggedIn(false), 2000);
      navigate('/dashboard');
      return true;
    } catch (error) {
      console.error('Login failed:', error.message);
      throw error;
    }
  }, [navigate]);

  const register = useCallback(async (userData, role = 'student') => {
    try {
      const newUser = { ...userData, role };
      const response = await axios.post(`${API_URL}/register`, newUser);
      const { user, token, refreshToken } = response.data;
      await login(user, token, refreshToken);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, [login]);

  const hasRole = useCallback((roles) => {
    if (!userRole) return false;
    if (Array.isArray(roles)) {
      return roles.includes(userRole);
    }
    return roles === userRole;
  }, [userRole]);

  useEffect(() => {
    const checkAuth = async () => {
      if (justLoggedIn) {
        console.log('Skipping auth check due to recent login');
        setLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const storedToken = localStorage.getItem('token');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      console.log('Checking auth with tokens:', { storedToken: !!storedToken, storedRefreshToken: !!storedRefreshToken });

      if (storedToken && storedRefreshToken) {
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          const user = response.data.user;
          localStorage.setItem('user', JSON.stringify(user));
          setCurrentUser(user);
          setUserRole(user.role || 'student');
          setIsAuthenticated(true);
          console.log('Auth check successful, user:', user.email);
        } catch (error) {
          console.error('Profile fetch failed:', error.response?.data || error.message);
          const refreshed = await refreshTokenFn();
          if (!refreshed) {
            console.warn('Auth refresh failed');
            setIsAuthenticated(false);
          }
        }
      } else {
        console.log('No token or refresh token found');
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, [justLoggedIn, refreshTokenFn]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && refreshAttempts < MAX_REFRESH_ATTEMPTS) {
          originalRequest._retry = true;
          setRefreshAttempts(prev => prev + 1);
          const refreshed = await refreshTokenFn();
          if (refreshed) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [refreshTokenFn, token, refreshAttempts, MAX_REFRESH_ATTEMPTS]);

  const value = useMemo(() => ({
    isAuthenticated,
    currentUser,
    userRole,
    loading,
    login,
    logout,
    register,
    hasRole,
    token,
    refreshToken: refreshTokenFn,
  }), [isAuthenticated, currentUser, userRole, loading, login, logout, register, hasRole, token, refreshTokenFn]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;