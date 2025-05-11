const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/User');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and profile data
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         name:
 *           type: string
 *           description: User name
 *         email:
 *           type: string
 *           description: User email
 *         role:
 *           type: string
 *           description: User role (student, teacher, admin)
 *         profilePicture:
 *           type: string
 *           description: URL to user's profile picture
 */

/**
 * @swagger
 * /api/users/profile/{userId}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

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