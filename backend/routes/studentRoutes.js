const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(restrictTo('student'));

// Dashboard data route
router.get('/dashboard', studentController.getDashboardData);

// Nearby students route
router.get('/nearby', studentController.getNearbyStudents);

// Learning paths routes
router.get('/learning-paths', studentController.getLearningPaths);
router.get('/learning-paths/:pathId', studentController.getLearningPath);
router.post('/sync-resources', studentController.syncResourcesWithLearningPaths);

// Analytics routes
router.get('/analytics', studentController.getPerformanceAnalytics);

// Recommended resources
router.get('/recommendations', studentController.getRecommendedResources);

// Mood/emotional state tracking
router.post('/mood', studentController.setMood);

// Add messaging routes
router.post('/message', studentController.sendMessage);
router.get('/messages', studentController.getMessages);
router.put('/messages/:messageId/read', studentController.markMessageRead);

// Add notification routes
router.get('/notifications', studentController.getNotifications);
router.post('/notifications', studentController.createNotifications);
router.put('/notifications/:notificationId/read', studentController.markNotificationRead);

module.exports = router;