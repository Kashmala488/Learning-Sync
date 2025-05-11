const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheMiddleware } = require('../middleware/cacheMiddleware');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only operations for system management
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
 *           description: User's full name
 *         email:
 *           type: string
 *           description: User's email address
 *         role:
 *           type: string
 *           enum: [student, teacher, admin]
 *           description: User's role in the system
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation date
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get('/users', authMiddleware, restrictTo('admin'), cacheMiddleware(1800), adminController.getAllUsers);

/**
 * @swagger
 * /api/admin/user/role:
 *   put:
 *     summary: Update a user's role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, teacher, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.put('/user/role', authMiddleware, restrictTo('admin'), 
  clearCacheMiddleware('cache:*:*/api/admin/users*'), 
  adminController.updateUserRole);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.delete('/users/:userId', authMiddleware, restrictTo('admin'), 
  clearCacheMiddleware('cache:*:*/api/admin/users*'), 
  adminController.deleteUser);

/**
 * @swagger
 * /api/admin/moderate:
 *   get:
 *     summary: Get content moderation queue (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of content awaiting moderation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   content:
 *                     type: string
 *                   type:
 *                     type: string
 *                   status:
 *                     type: string
 *                   reportedBy:
 *                     type: string
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get('/moderate', authMiddleware, restrictTo('admin'), cacheMiddleware(300), adminController.getModerationQueue);

/**
 * @swagger
 * /api/admin/moderate/{contentId}:
 *   post:
 *     summary: Moderate a piece of content (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the content to moderate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject, delete]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Content moderated successfully
 *       404:
 *         description: Content not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.post('/moderate/:contentId', authMiddleware, restrictTo('admin'), 
  clearCacheMiddleware('cache:*:*/api/admin/moderate*'), 
  adminController.moderateContent);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Generate system reports (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userStats:
 *                   type: object
 *                 contentStats:
 *                   type: object
 *                 engagementMetrics:
 *                   type: object
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get('/reports', authMiddleware, restrictTo('admin'), cacheMiddleware(1800), adminController.generateReports);

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get system settings (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get('/settings', authMiddleware, restrictTo('admin'), cacheMiddleware(3600), adminController.getSettings);

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update system settings (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.put('/settings', authMiddleware, restrictTo('admin'), 
  clearCacheMiddleware('cache:*:*/api/admin/settings*'), 
  adminController.updateSettings);

/**
 * @swagger
 * /api/admin/security-alerts:
 *   get:
 *     summary: Get security alerts (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of security alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   type:
 *                     type: string
 *                   severity:
 *                     type: string
 *                   description:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get('/security-alerts', authMiddleware, restrictTo('admin'), cacheMiddleware(900), adminController.getSecurityAlerts);

/**
 * @swagger
 * /api/admin/security-alerts/{alertId}/view:
 *   put:
 *     summary: Mark a security alert as viewed (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the security alert
 *     responses:
 *       200:
 *         description: Alert marked as viewed successfully
 *       404:
 *         description: Alert not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.put('/security-alerts/:alertId/view', authMiddleware, restrictTo('admin'), 
  clearCacheMiddleware('cache:*:*/api/admin/security-alerts*'), 
  adminController.markAlertAsViewed);

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get detailed system analytics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed system analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get('/analytics', authMiddleware, restrictTo('admin'), cacheMiddleware(1800), adminController.getDetailedAnalytics);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.get('/dashboard', authMiddleware, restrictTo('admin'), cacheMiddleware(1800), adminController.generateReports);

module.exports = router;