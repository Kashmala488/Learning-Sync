const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student management and data
 */

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(restrictTo('student'));

/**
 * @swagger
 * /api/students/dashboard:
 *   get:
 *     summary: Get student dashboard data
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data for the student
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/dashboard', studentController.getDashboardData);

/**
 * @swagger
 * /api/students/nearby:
 *   get:
 *     summary: Find nearby students
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of nearby students
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/nearby', studentController.getNearbyStudents);

/**
 * @swagger
 * /api/students/learning-paths:
 *   get:
 *     summary: Get learning paths for student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of learning paths
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/learning-paths', studentController.getLearningPaths);

/**
 * @swagger
 * /api/students/learning-paths/{pathId}:
 *   get:
 *     summary: Get specific learning path
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pathId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the learning path
 *     responses:
 *       200:
 *         description: Learning path details
 *       404:
 *         description: Learning path not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/learning-paths/:pathId', studentController.getLearningPath);

/**
 * @swagger
 * /api/students/sync-resources:
 *   post:
 *     summary: Sync resources with learning paths
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resources synced successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/sync-resources', studentController.syncResourcesWithLearningPaths);

/**
 * @swagger
 * /api/students/analytics:
 *   get:
 *     summary: Get student performance analytics
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student analytics data
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/analytics', studentController.getPerformanceAnalytics);

/**
 * @swagger
 * /api/students/recommendations:
 *   get:
 *     summary: Get recommended resources
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recommended resources
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/recommendations', studentController.getRecommendedResources);

/**
 * @swagger
 * /api/students/mood:
 *   post:
 *     summary: Set student mood
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mood
 *             properties:
 *               mood:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mood set successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/mood', studentController.setMood);

/**
 * @swagger
 * /api/students/message:
 *   post:
 *     summary: Send a message
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientIds
 *               - content
 *             properties:
 *               recipientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/message', studentController.sendMessage);

/**
 * @swagger
 * /api/students/messages:
 *   get:
 *     summary: Get student's messages
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of messages
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/messages', studentController.getMessages);

/**
 * @swagger
 * /api/students/messages/{messageId}/read:
 *   put:
 *     summary: Mark message as read
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the message
 *     responses:
 *       200:
 *         description: Message marked as read
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.put('/messages/:messageId/read', studentController.markMessageRead);

/**
 * @swagger
 * /api/students/notifications:
 *   get:
 *     summary: Get student's notifications
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/notifications', studentController.getNotifications);

/**
 * @swagger
 * /api/students/notifications:
 *   post:
 *     summary: Create notifications
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - content
 *             properties:
 *               type:
 *                 type: string
 *               content:
 *                 type: string
 *               relatedId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/notifications', studentController.createNotifications);

/**
 * @swagger
 * /api/students/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the notification
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.put('/notifications/:notificationId/read', studentController.markNotificationRead);

module.exports = router;