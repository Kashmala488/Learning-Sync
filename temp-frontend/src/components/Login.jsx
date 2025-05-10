import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:4000';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegularLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Regular login attempt:', { email });
      let location = null;
      if (navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                coordinates: [position.coords.longitude, position.coords.latitude],
                locationSharing: true
              });
            },
            () => resolve(null)
          );
        });
      }

      const response = await axios.post(`${process.env.REACT_APP_API_URL || API_URL}/api/users/login`, {
        email,
        password,
        location
      });

      const { user, token, refreshToken } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Stored tokens:', { token, refreshToken, user: user.email });
      await login(user, token, refreshToken);

      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Regular login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setIsLoading(true);

    try {
      console.log('Google login attempt');
      if (!credentialResponse.credential) {
        toast.error('Google login failed: No credential received');
        return;
      }

      let location = null;
      if (navigator.geolocation) {
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                coordinates: [position.coords.longitude, position.coords.latitude],
                locationSharing: true
              });
            },
            () => resolve(null)
          );
        });
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || API_URL}/api/users/social-login`,
        { credential: credentialResponse.credential, location },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const { user, token, refreshToken } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Stored tokens:', { token, refreshToken, user: user.email });
      await login(user, token, refreshToken);

      toast.success('Google login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error.response?.data || error.message);
      if (error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to server. Please check if the backend is running.');
      } else if (error.message.includes('AbortError')) {
        toast.error('Google login aborted. Please try again or use email login.');
      } else if (error.message.includes('origin is not allowed')) {
        toast.error('Google login failed: Invalid client ID configuration. Please use email login.');
      } else {
        toast.error(error.response?.data?.message || 'Google login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    console.error('Google login failed');
    toast.error('Google login failed. Please try again or use email login.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login to Your Account</h2>

        <form onSubmit={handleRegularLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              useOneTap={false} // Disabled to avoid FedCM issues
              flow="implicit"
              auto_select={false}
              theme="outline"
              width="280"
            />
          </div>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/register" className="text-blue-600 hover:underline">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;