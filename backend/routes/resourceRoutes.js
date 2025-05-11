const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Resources
 *   description: Learning resource management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Resource:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Resource ID
 *         title:
 *           type: string
 *           description: Resource title
 *         content:
 *           type: string
 *           description: Resource content
 *         sharedBy:
 *           type: string
 *           description: ID of the user who shared the resource
 *         rating:
 *           type: number
 *           description: Average rating of the resource
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 */

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/resources/my-resources:
 *   get:
 *     summary: Get resources for the current user
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's resources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resource'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/my-resources', resourceController.getUserResources);

/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Get all resources
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all resources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resource'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/', resourceController.getAllResources);

/**
 * @swagger
 * /api/resources/{resourceId}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the resource
 *     responses:
 *       200:
 *         description: Resource data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 *       404:
 *         description: Resource not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/:resourceId', resourceController.getResource);

/**
 * @swagger
 * /api/resources/share:
 *   post:
 *     summary: Share a new resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Resource shared successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/share', resourceController.shareResource);

/**
 * @swagger
 * /api/resources/{resourceId}/share:
 *   post:
 *     summary: Share resource with groups
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the resource
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupIds
 *             properties:
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Resource shared with groups successfully
 *       404:
 *         description: Resource not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:resourceId/share', resourceController.shareResourceWithGroups);

/**
 * @swagger
 * /api/resources/{resourceId}:
 *   put:
 *     summary: Update a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the resource
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resource updated successfully
 *       404:
 *         description: Resource not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.put('/:resourceId', resourceController.updateResource);

/**
 * @swagger
 * /api/resources/{resourceId}:
 *   delete:
 *     summary: Delete a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the resource
 *     responses:
 *       200:
 *         description: Resource deleted successfully
 *       404:
 *         description: Resource not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.delete('/:resourceId', resourceController.deleteResource);

/**
 * @swagger
 * /api/resources/{resourceId}/rate:
 *   post:
 *     summary: Rate a resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the resource
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resource rated successfully
 *       404:
 *         description: Resource not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:resourceId/rate', resourceController.rateResource);

/**
 * @swagger
 * /api/resources/{resourceId}/complete:
 *   post:
 *     summary: Mark resource as complete
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the resource
 *     responses:
 *       200:
 *         description: Resource marked as complete
 *       404:
 *         description: Resource not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:resourceId/complete', resourceController.markResourceComplete);

/**
 * @swagger
 * /api/resources/generate:
 *   post:
 *     summary: Generate an AI resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *               additionalInfo:
 *                 type: string
 *     responses:
 *       201:
 *         description: AI resource generated successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/generate', resourceController.generateAIResource);

module.exports = router;