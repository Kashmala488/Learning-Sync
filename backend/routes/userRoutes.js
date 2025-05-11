const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Get user profile by ID (for public profiles like teachers)
router.get('/profile/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -refreshToken')
      .lean();
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    return res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching user profile' 
    });
  }
});

module.exports = router; 