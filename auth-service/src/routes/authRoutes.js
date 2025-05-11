// const express = require('express');
// const { body } = require('express-validator');
// const authController = require('../controllers/auth');
// const { protect, restrictTo } = require('../middleware/authMiddleware');

// const router = express.Router();

// /**
//  * @swagger
//  * components:
//  *   schemas:
//  *     User:
//  *       type: object
//  *       required:
//  *         - name
//  *         - email
//  *         - password
//  *         - role
//  *       properties:
//  *         name:
//  *           type: string
//  *           description: The user's full name
//  *         email:
//  *           type: string
//  *           format: email
//  *           description: The user's email address
//  *         password:
//  *           type: string
//  *           format: password
//  *           description: The user's password
//  *         role:
//  *           type: string
//  *           enum: [student, teacher, admin]
//  *           description: The user's role
//  *     LoginCredentials:
//  *       type: object
//  *       required:
//  *         - email
//  *         - password
//  *       properties:
//  *         email:
//  *           type: string
//  *           format: email
//  *         password:
//  *           type: string
//  *           format: password
//  *     AuthResponse:
//  *       type: object
//  *       properties:
//  *         success:
//  *           type: boolean
//  *         message:
//  *           type: string
//  *         user:
//  *           $ref: '#/components/schemas/User'
//  *         token:
//  *           type: string
//  *         refreshToken:
//  *           type: string
//  */

// /**
//  * @swagger
//  * /api/auth/register:
//  *   post:
//  *     summary: Register a new user
//  *     tags: [Auth]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/User'
//  *     responses:
//  *       201:
//  *         description: User registered successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/AuthResponse'
//  *       400:
//  *         description: Invalid input or user already exists
//  */
// router.post('/register', [
//   body('name').notEmpty().withMessage('Name is required'),
//   body('email').isEmail().withMessage('Please provide a valid email'),
//   body('password')
//     .isLength({ min: 6 })
//     .withMessage('Password must be at least 6 characters long')
// ], authController.register);

// /**
//  * @swagger
//  * /api/auth/login:
//  *   post:
//  *     summary: Login user
//  *     tags: [Auth]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/LoginCredentials'
//  *     responses:
//  *       200:
//  *         description: Login successful
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/AuthResponse'
//  *       400:
//  *         description: Invalid credentials
//  */
// router.post('/login', [
//   body('email').isEmail().withMessage('Please provide a valid email'),
//   body('password').notEmpty().withMessage('Password is required')
// ], authController.login);

// /**
//  * @swagger
//  * /api/auth/refresh-token:
//  *   post:
//  *     summary: Refresh authentication token
//  *     tags: [Auth]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - refreshToken
//  *             properties:
//  *               refreshToken:
//  *                 type: string
//  *     responses:
//  *       200:
//  *         description: Token refreshed successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 token:
//  *                   type: string
//  *                 refreshToken:
//  *                   type: string
//  *       401:
//  *         description: Invalid or expired refresh token
//  */
// router.post('/refresh-token', authController.refreshToken);

// /**
//  * @swagger
//  * /api/auth/logout:
//  *   post:
//  *     summary: Logout user
//  *     tags: [Auth]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: Logout successful
//  *       401:
//  *         description: Not authenticated
//  */
// router.post('/logout', protect, authController.logout);

// /**
//  * @swagger
//  * /api/auth/me:
//  *   get:
//  *     summary: Get current user profile
//  *     tags: [Auth]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: User profile retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                 data:
//  *                   $ref: '#/components/schemas/User'
//  *       401:
//  *         description: Not authenticated
//  */
// router.get('/me', protect, authController.getCurrentUser);

// /**
//  * @swagger
//  * /api/auth/social-login:
//  *   post:
//  *     summary: Login with Google
//  *     tags: [Auth]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - credential
//  *               - role
//  *             properties:
//  *               credential:
//  *                 type: string
//  *                 description: Google OAuth credential
//  *               role:
//  *                 type: string
//  *                 enum: [student, teacher, admin]
//  *     responses:
//  *       200:
//  *         description: Social login successful
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/AuthResponse'
//  *       400:
//  *         description: Invalid credentials or role
//  */
// router.post('/social-login', authController.socialLogin);

// // Health check endpoint
// router.get('/health', (req, res) => {
//   res.status(200).json({ status: 'OK', service: 'auth-service' });
// });

// module.exports = router; 