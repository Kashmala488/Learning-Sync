import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

// API base URL
const API_URL = 'http://localhost:4000';

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
      await axios.post(`${process.env.REACT_APP_API_URL || API_URL}/api/users/register`, {
        name,
        email,
        password,
        role
      });
      
      // For student users, auto-login and redirect to group selection
      if (role === 'student') {
        try {
          const loginResponse = await axios.post(`${process.env.REACT_APP_API_URL || API_URL}/api/users/login`, {
            email,
            password
          });
          
          const { user, token, refreshToken } = loginResponse.data;
          await login(user, token, refreshToken);
          
          toast.success('Registration successful!');
          navigate('/group-selection');
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          toast.success('Registration successful! Please log in.');
          navigate('/login');
        }
      } else {
        // For non-student users, just redirect to login
      toast.success('Registration successful! Please log in.');
      navigate('/login');
      }
    } catch (error) {
      console.error('Register error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setIsLoading(true);
    
    try {
      console.log('Google register attempt:', { role });
      if (!credentialResponse.credential) {
        toast.error('Google sign-up failed: No credential received');
        return;
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || API_URL}/api/users/social-login`,
        { 
          credential: credentialResponse.credential,
          role
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: false,
          timeout: 10000,
          validateStatus: status => status >= 200 && status < 500
        }
      );
      
      const { user, token, refreshToken } = response.data;
      await login(user, token, refreshToken);
      
      toast.success('Google sign-up successful!');
      
      // Redirect student users to group selection
      if (role === 'student') {
        navigate('/group-selection');
      } else {
      navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google sign-up error:', error.response?.data || error.message);
      if (error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to server. Please check if the backend is running.');
      } else {
        toast.error(error.response?.data?.message || 'Google sign-up failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    console.error('Google sign-up failed');
    toast.error('Google sign-up failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create an Account</h2>
        
        <form onSubmit={handleRegularRegister} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
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
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="role">
              Register as
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Registering...' : 'Register'}
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
              useOneTap
              flow="implicit"
              auto_select={false}
              context="signup"
              ux_mode="popup"
              width="280"
            />
          </div>
          
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="text-blue-600 hover:underline">Login here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;