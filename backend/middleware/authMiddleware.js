const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(`Role check for ${req.method} ${req.path} - User: ${req.user.email}, Role: ${req.user.role}, Allowed roles: [${roles.join(', ')}]`);
    
    if (!roles.includes(req.user.role)) {
      console.log(`Access denied: User ${req.user.email} with role ${req.user.role} attempted to access ${req.method} ${req.path} - Required roles: [${roles.join(', ')}]`);
      return res.status(403).json({ 
        error: 'Access denied', 
        userRole: req.user.role,
        requiredRoles: roles
      });
    }
    next();
  };
};

module.exports = { authMiddleware, restrictTo };