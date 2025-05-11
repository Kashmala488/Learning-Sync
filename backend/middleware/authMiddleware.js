const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001/api/auth';

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify token with auth service
      const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Check if response and user data exist
      if (!response.data || !response.data.user) {
        return res.status(401).json({ message: 'Invalid user data from auth service' });
      }

      const authUser = response.data.user;

      // Find or create user in backend database
      let user = await User.findOne({ email: authUser.email });
      
      if (!user) {
        // Create new user in backend database
        user = new User({
          name: authUser.name,
          email: authUser.email,
          role: authUser.role || 'student',
          socialId: authUser.socialId,
          profilePicture: authUser.profilePicture
        });
        await user.save();
        console.log('Created new user in backend:', user.email);
      }

      // Update user data if needed
      if (user.name !== authUser.name || user.role !== authUser.role) {
        user.name = authUser.name;
        user.role = authUser.role;
        await user.save();
        console.log('Updated user data in backend:', user.email);
      }

      // Set user info in request
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth service error details:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        return res.status(401).json({ message: 'Token is invalid or expired' });
      }
      
      return res.status(500).json({ 
        message: 'Auth service error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Role-based middleware (new version)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authorization denied' });
    }

    if (!req.user.role) {
      console.error('User role missing in authorize middleware:', req.user);
      return res.status(401).json({ message: 'User role not found' });
    }

    if (!roles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({
        message: 'Permission denied',
        userRole: req.user.role,
        requiredRoles: roles
      });
    }

    next();
  };
};

// Role-based middleware (legacy version for backward compatibility)
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authorization denied' });
    }

    if (!req.user.role) {
      console.error('User role missing in restrictTo middleware:', req.user);
      return res.status(401).json({ message: 'User role not found' });
    }

    if (!roles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({
        message: 'Permission denied',
        userRole: req.user.role,
        requiredRoles: roles
      });
    }

    next();
  };
};

module.exports = { authMiddleware, authorize, restrictTo }; 