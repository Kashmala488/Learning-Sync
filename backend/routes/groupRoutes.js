const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheMiddleware } = require('../middleware/cacheMiddleware');

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management and interactions
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Group ID
 *         name:
 *           type: string
 *           description: Group name
 *         subject:
 *           type: string
 *           description: Subject or topic of the group
 *         description:
 *           type: string
 *           description: Group description
 *         members:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who are members
 *         mentor:
 *           type: string
 *           description: ID of the teacher mentoring this group
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 */

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/', cacheMiddleware(1800), groupController.getAllGroups);

/**
 * @swagger
 * /api/groups/create:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
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
 *               - subject
 *             properties:
 *               name:
 *                 type: string
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Group created successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/create', clearCacheMiddleware('cache:*:*/api/groups*'), groupController.createGroup);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Get a group by ID
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group
 *     responses:
 *       200:
 *         description: Group details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/:groupId', cacheMiddleware(1800), groupController.getGroup);

/**
 * @swagger
 * /api/groups/{groupId}/join:
 *   post:
 *     summary: Join a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group to join
 *     responses:
 *       200:
 *         description: Successfully joined the group
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:groupId/join', clearCacheMiddleware('cache:*:*/api/groups*'), groupController.joinGroup);

/**
 * @swagger
 * /api/groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group to leave
 *     responses:
 *       200:
 *         description: Successfully left the group
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:groupId/leave', clearCacheMiddleware('cache:*:*/api/groups*'), groupController.leaveGroup);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Delete a group (admin only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group to delete
 *     responses:
 *       200:
 *         description: Group deleted successfully
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.delete('/:groupId', restrictTo('admin'), clearCacheMiddleware('cache:*:*/api/groups*'), groupController.deleteGroup);

/**
 * @swagger
 * /api/groups/{groupId}/message:
 *   post:
 *     summary: Send a message to a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:groupId/message', groupController.sendMessage);

/**
 * @swagger
 * /api/groups/{groupId}/message/file:
 *   post:
 *     summary: Send a message with file to a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - content
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message with file sent successfully
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:groupId/message/file', groupController.sendMessageWithFile);

/**
 * @swagger
 * /api/groups/{groupId}/messages:
 *   get:
 *     summary: Get all messages for a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group
 *     responses:
 *       200:
 *         description: List of group messages
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
 *                   sender:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   fileUrl:
 *                     type: string
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/:groupId/messages', cacheMiddleware(300), groupController.getGroupMessages);

/**
 * @swagger
 * /api/groups/mentor/available:
 *   get:
 *     summary: Get groups without a mentor (teacher only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups without a mentor
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Teacher only
 *       500:
 *         description: Server error
 */
router.get('/mentor/available', restrictTo('teacher'), cacheMiddleware(1800), groupController.getGroupsWithoutMentorForTeacher);

/**
 * @swagger
 * /api/groups/mentor/my-groups:
 *   get:
 *     summary: Get groups mentored by the teacher (teacher only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups mentored by the teacher
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Teacher only
 *       500:
 *         description: Server error
 */
router.get('/mentor/my-groups', restrictTo('teacher'), cacheMiddleware(1800), groupController.getTeacherMentoredGroups);

/**
 * @swagger
 * /api/groups/{groupId}/mentor/assign:
 *   post:
 *     summary: Assign the teacher as mentor to a group (teacher only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group
 *     responses:
 *       200:
 *         description: Teacher assigned as mentor successfully
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Teacher only
 *       500:
 *         description: Server error
 */
router.post('/:groupId/mentor/assign', restrictTo('teacher'), clearCacheMiddleware('cache:*:*/api/groups/mentor*'), groupController.assignMentor);

/**
 * @swagger
 * /api/groups/{groupId}/mentor/unassign:
 *   post:
 *     summary: Unassign the teacher as mentor from a group (teacher only)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group
 *     responses:
 *       200:
 *         description: Teacher unassigned as mentor successfully
 *       404:
 *         description: Group not found
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Teacher only
 *       500:
 *         description: Server error
 */
router.post('/:groupId/mentor/unassign', restrictTo('teacher'), clearCacheMiddleware('cache:*:*/api/groups/mentor*'), groupController.unassignMentor);

/**
 * @swagger
 * /api/groups/recommendations/find:
 *   get:
 *     summary: Get AI-recommended groups for the user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recommended groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/recommendations/find', cacheMiddleware(1800), groupController.findRecommendedGroups);

module.exports = router;