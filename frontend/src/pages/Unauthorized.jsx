import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Unauthorized = () => {
  const { userRole } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="text-red-500 text-5xl mb-4">
          <i className="fas fa-exclamation-circle"></i>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          Sorry, you don't have permission to access this page. This area requires different access privileges.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Your current role: <span className="font-semibold">{userRole || 'Unknown'}</span>
        </p>
        <div className="flex flex-col space-y-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized; 