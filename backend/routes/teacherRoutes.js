const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Teachers
 *   description: Teacher management and data
 */

/**
 * @swagger
 * /api/teachers/students/progress:
 *   get:
 *     summary: Get all students progress
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all students with their progress
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/students/progress', authMiddleware, restrictTo('teacher'), teacherController.getAllStudentsProgress);

/**
 * @swagger
 * /api/teachers/classes:
 *   get:
 *     summary: Get teacher's classes
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teacher's classes
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Server error
 */
router.get('/classes', authMiddleware, restrictTo('teacher'), teacherController.getClasses);

/**
 * @swagger
 * /api/teachers/message:
 *   post:
 *     summary: Send a message
 *     tags: [Teachers]
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
router.post('/message', authMiddleware, restrictTo('teacher'), teacherController.sendMessage);

/**
 * @swagger
 * /api/teachers/messages:
 *   get:
 *     summary: Get teacher's messages
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teacher's messages
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/messages', authMiddleware, restrictTo('teacher'), teacherController.getMessages);

/**
 * @swagger
 * /api/teachers/messages/{messageId}/read:
 *   put:
 *     summary: Mark message as read
 *     tags: [Teachers]
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
router.put('/messages/:messageId/read', authMiddleware, restrictTo('teacher'), teacherController.markMessageRead);

/**
 * @swagger
 * /api/teachers/notifications:
 *   get:
 *     summary: Get teacher's notifications
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teacher's notifications
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/notifications', authMiddleware, restrictTo('teacher'), teacherController.getNotifications);

/**
 * @swagger
 * /api/teachers/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Teachers]
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
router.put('/notifications/:notificationId/read', authMiddleware, restrictTo('teacher'), teacherController.markNotificationRead);

/**
 * @swagger
 * /api/teachers/analytics:
 *   get:
 *     summary: Get teacher analytics
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher analytics data
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/analytics', authMiddleware, restrictTo('teacher'), teacherController.getAnalytics);

/**
 * @swagger
 * /api/teachers/learning-paths:
 *   get:
 *     summary: Get learning paths created by teacher
 *     tags: [Teachers]
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
router.get('/learning-paths', authMiddleware, restrictTo('teacher'), teacherController.getLearningPaths);

/**
 * @swagger
 * /api/teachers/track/{studentId}:
 *   get:
 *     summary: Track student progress
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the student
 *     responses:
 *       200:
 *         description: Student progress data
 *       404:
 *         description: Student not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/track/:studentId', authMiddleware, restrictTo('teacher'), teacherController.trackProgress);

/**
 * @swagger
 * /api/teachers/{teacherId}:
 *   get:
 *     summary: Get teacher info
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the teacher
 *     responses:
 *       200:
 *         description: Teacher information
 *       403:
 *         description: Not a teacher
 *       500:
 *         description: Server error
 */
router.get('/:teacherId', authMiddleware, restrictTo('teacher'), teacherController.getTeacherInfo);

/**
 * @swagger
 * /api/teachers/add:
 *   post:
 *     summary: Add a new teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher added successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/add', authMiddleware, restrictTo('admin'), teacherController.addTeacher);

/**
 * @swagger
 * /api/teachers/delete/{teacherId}:
 *   delete:
 *     summary: Delete a teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the teacher
 *     responses:
 *       200:
 *         description: Teacher deleted successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.delete('/delete/:teacherId', authMiddleware, restrictTo('admin'), teacherController.deleteTeacher);

/**
 * @swagger
 * /api/teachers/assign:
 *   post:
 *     summary: Assign resource to student
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - title
 *               - content
 *             properties:
 *               studentId:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Resource assigned successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/assign', authMiddleware, restrictTo('teacher'), teacherController.assignResource);

/**
 * @swagger
 * /api/teachers/learning-path:
 *   post:
 *     summary: Create learning path for student
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - title
 *             properties:
 *               studentId:
 *                 type: string
 *               title:
 *                 type: string
 *               resources:
 *                 type: array
 *                 items:
 *                   type: string
 *               quizzes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Learning path created successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/learning-path', authMiddleware, restrictTo('teacher'), teacherController.createLearningPath);

module.exports = router;