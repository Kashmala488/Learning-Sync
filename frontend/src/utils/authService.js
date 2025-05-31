import axios from 'axios';

// URLs for both services
const MAIN_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:4001/api/auth';

// Setup axios instances
const mainApi = axios.create({
  baseURL: MAIN_API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for cookies
});

const authApi = axios.create({
  baseURL: AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for cookies
});

// Add token to every request
const addAuthHeader = (token) => {
  if (token) {
    mainApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete mainApi.defaults.headers.common['Authorization'];
    delete authApi.defaults.headers.common['Authorization'];
  }
};

// Add response interceptor for handling token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await authApi.post('/refresh-token', { refreshToken });
        const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
        
        if (!newToken || !newRefreshToken || !user) {
          throw new Error('Invalid refresh response');
        }

        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        addAuthHeader(newToken);
        
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return authApi(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth service functions
const authService = {
  // Registration
  register: async (userData) => {
    try {
      const response = await authApi.post('/register', userData);
      const { token, refreshToken, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      addAuthHeader(token);
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Login
  login: async (email, password, location = null) => {
    try {
      const response = await authApi.post('/login', {
        email,
        password,
        location
      });
      
      const { token, refreshToken, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      addAuthHeader(token);
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Social login
  socialLogin: async (credential, role = 'student', location = null) => {
    try {
      const response = await authApi.post('/social-login', { 
        credential,
        role,
        location
      });
      
      const { token, refreshToken, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      addAuthHeader(token);
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    try {
      const response = await authApi.post('/refresh-token', { refreshToken });
      const { token: newToken, refreshToken: newRefreshToken, user } = response.data;
      
      if (!newToken || !newRefreshToken || !user) {
        throw new Error('Invalid refresh response');
      }

      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      addAuthHeader(newToken);
      
      return response.data;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      addAuthHeader(null);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await authApi.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      addAuthHeader(null);
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }
      
      addAuthHeader(token);
      const response = await authApi.get('/me');
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await authService.refreshToken(refreshToken);
            return refreshResponse.user;
          }
        } catch (refreshError) {
          return null;
        }
      }
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Add method to synchronize data with main API if needed
  syncWithMainApi: async (userData) => {
    try {
      const token = localStorage.getItem('token');
      addAuthHeader(token);
      
      await mainApi.post('/users/sync', { userData });
      
      return { success: true };
    } catch (error) {
      console.error('Error syncing with main API:', error);
      return { success: false, error };
    }
  }
};

export default authService; 