const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/gmail-auth', userController.gmailAuth);
router.post('/refresh-token', userController.refreshToken);
router.post('/logout', authMiddleware, userController.logout);
router.post('/social-login', userController.socialLogin);
router.post('/update-location', authMiddleware, userController.updateLocation);

// Profile routes
router.get('/profile', authMiddleware, userController.getProfile);
router.get('/auth/profile', authMiddleware, userController.getProfile); // Added for compatibility
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/profile/student', authMiddleware, restrictTo('student'), userController.updateStudentProfile);
router.put('/profile/teacher', authMiddleware, restrictTo('teacher'), userController.updateTeacherProfile);
router.post('/profile/picture', authMiddleware, userController.updateProfilePicture);

// Get profile by ID (for viewing teacher profiles)
router.get('/profile/:userId', authMiddleware, userController.getProfileById);

// New route to fetch user-joined groups
router.get('/groups', authMiddleware, userController.getUserGroups);

module.exports = router;