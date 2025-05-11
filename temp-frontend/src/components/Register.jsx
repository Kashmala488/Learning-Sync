import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import config from '../utils/config';

const API_URL = config.authApiUrl;

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegularRegister = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Regular register attempt:', { name, email, role });
      const response = await axios.post(`${API_URL}/register`, {
        name,
        email,
        password,
        role
      });
      
      const { user, token, refreshToken } = response.data;
      console.log('Registration successful:', { email: user.email, role: user.role });
      
      await login(user, token, refreshToken);
      toast.success('Registration successful!');
      
      if (role === 'student') {
          navigate('/group-selection');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async (credentialResponse) => {
    try {
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
      
      const response = await axios.post(`${API_URL}/social-login`, {
          credential: credentialResponse.credential,
        role,
        location
      });
      
      const { user, token, refreshToken } = response.data;
      console.log('Google registration successful:', { email: user.email, role: user.role });
      
      await login(user, token, refreshToken);
      toast.success('Registration with Google successful!');
      
      if (role === 'student') {
        navigate('/group-selection');
      } else {
      navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google registration error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Registration with Google failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleRegularRegister}>
          <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
              <div className="mt-1">
            <input
              id="name"
                  name="name"
              type="text"
                  autoComplete="name"
                  required
              value={name}
              onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
              </div>
          </div>
          
          <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
            </label>
              <div className="mt-1">
            <input
              id="email"
                  name="email"
              type="email"
                  autoComplete="email"
                  required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
              </div>
          </div>
          
          <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
              <div className="mt-1">
            <input
              id="password"
                  name="password"
              type="password"
                  autoComplete="new-password"
                  required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
              </div>
          </div>
          
          <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
              <div className="mt-1">
            <input
              id="confirmPassword"
                  name="confirmPassword"
              type="password"
                  autoComplete="new-password"
                  required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
              </div>
          </div>
          
          <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
            </label>
              <div className="mt-1">
            <select
              id="role"
                  name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
              </div>
          </div>
          
            <div>
          <button
            type="submit"
            disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
                {isLoading ? 'Creating account...' : 'Create account'}
          </button>
            </div>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
            <div className="mt-6">
              <div className="flex justify-center">
            <GoogleLogin
                  onSuccess={handleGoogleRegister}
                  onError={() => {
                    console.log('Google Registration Failed');
                    toast.error('Registration with Google failed. Please try again.');
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="relative">
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Sign in
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;