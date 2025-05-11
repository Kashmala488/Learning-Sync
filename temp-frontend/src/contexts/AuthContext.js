import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const AuthContext = createContext();
const API_URL = process.env.REACT_APP_MERN_API_URL || 'http://localhost:4000';
const MAX_REFRESH_ATTEMPTS = 5;

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const validateToken = useCallback(async (tokenToValidate) => {
    try {
      const response = await axios.get(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${tokenToValidate}` },
      });
      console.log('Token validation successful:', response.data.data.email);
      return true;
    } catch (error) {
      console.error('Token validation failed:', error.response?.data || error.message);
      return false;
    }
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromise = useState(null)[0]; // To track ongoing refresh promise

  const logout = useCallback(async () => {
    try {
      if (isAuthenticated && token) {
        await axios.post(
          `${API_URL}/api/users/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Logout failed:', error.response?.data || error.message);
    } finally {
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
      navigate('/login');
      toast.info('Logged out successfully');
    }
  }, [isAuthenticated, token, navigate]);

  const refreshTokenFn = useCallback(async () => {
    if (isRefreshing) {
      console.warn('Refresh already in progress, waiting...');
      return refreshPromise ? await refreshPromise : false;
    }

    if (!refreshToken) {
      console.warn('No refresh token available');
      await logout();
      return false;
    }

    try {
      setIsRefreshing(true);
      const currentAttempt = refreshAttempts + 1;
      setRefreshAttempts(currentAttempt);
      console.log('Attempting token refresh', { attempt: currentAttempt });

      refreshPromise.current = axios.post(
        `${API_URL}/api/users/refresh-token`,
        { refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: status => status < 500,
        }
      );

      const response = await refreshPromise.current;

      if (response.status === 401) {
        throw new Error('Invalid refresh token');
      }

      const { token: newToken, refreshToken: newRefreshToken } = response.data;
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setRefreshAttempts(0); // Reset attempts on success
      console.log('Token refresh successful');
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error.message, error.response?.data);
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.warn('Max refresh attempts reached, logging out');
        await logout();
      }
      return false;
    } finally {
      setIsRefreshing(false);
      refreshPromise.current = null;
    }
  }, [refreshToken, refreshAttempts, isRefreshing, logout]);

  const checkAuth = useCallback(async () => {
    if (justLoggedIn) {
      console.log('Skipping auth check due to recent login');
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedToken || !storedRefreshToken) {
      console.warn('No token or refresh token, redirecting to login');
      setLoading(false);
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      setToken(storedToken);
      setRefreshToken(storedRefreshToken);
      const isValid = await validateToken(storedToken);
      if (!isValid) {
        throw new Error('Invalid token');
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      const response = await axios.get(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const user = response.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      setUserRole(user.role || 'student');
      setIsAuthenticated(true);
      console.log('Auth check successful, user:', user.email);
    } catch (error) {
      console.error('Profile fetch failed:', error.response?.data || error.message);
      if (error.response?.status === 401 || error.response?.status === 500) {
        console.warn('Attempting token refresh due to profile fetch error');
        const refreshed = await refreshTokenFn();
        if (!refreshed) {
          console.warn('Auth refresh failed, redirecting to login');
          navigate('/login', { state: { from: location.pathname } });
        }
      } else {
        navigate('/login', { state: { from: location.pathname } });
      }
    } finally {
      setLoading(false);
    }
  }, [justLoggedIn, refreshTokenFn, navigate, location.pathname, validateToken]);

  const login = useCallback(async (user, token, refreshToken) => {
    try {
      if (!user || typeof user !== 'object' || !user.email) {
        throw new Error('Invalid user data');
      }
      if (!token || !refreshToken) {
        throw new Error('Token or refresh token missing');
      }
      console.log('Login with user:', { email: user.email, role: user.role });

      const isValid = await validateToken(token);
      if (!isValid) {
        throw new Error('Invalid login token');
      }

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
              await axios.post(
                `${API_URL}/api/users/update-location`,
                {
                  coordinates: [longitude, latitude],
                  locationSharing: true,
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log('Location updated successfully');
            } catch (err) {
              console.warn('Failed to update location:', err);
            }
          },
          (error) => {
            console.warn('Location permission denied:', error);
          }
        );
      }

      setTimeout(() => setJustLoggedIn(false), 2000);
      navigate('/dashboard');
      toast.success('Login successful');
      return true;
    } catch (error) {
      console.error('Login failed:', error.message);
      toast.error('Login failed: ' + error.message);
      throw error;
    }
  }, [navigate, validateToken]);

  const register = useCallback(async (userData, role = 'student') => {
    try {
      const newUser = { ...userData, role };
      const response = await axios.post(`${API_URL}/api/users/register`, newUser);
      const { user, token, refreshToken } = response.data;
      await login(user, token, refreshToken);
      toast.success('Registration successful');
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      toast.error('Registration failed: ' + (error.response?.data?.message || error.message));
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
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          refreshAttempts < MAX_REFRESH_ATTEMPTS &&
          refreshToken
        ) {
          originalRequest._retry = true;
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
  }, [refreshTokenFn, token, refreshAttempts, refreshToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = useMemo(
    () => ({
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
    }),
    [isAuthenticated, currentUser, userRole, loading, login, logout, register, hasRole, token, refreshTokenFn]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;