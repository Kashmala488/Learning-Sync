const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Learning Paths
 *   description: Learning path management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LearningPath:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Learning path ID
 *         title:
 *           type: string
 *           description: Learning path title
 *         description:
 *           type: string
 *           description: Learning path description
 *         createdBy:
 *           type: string
 *           description: ID of teacher who created the path
 *         subject:
 *           type: string
 *           description: Subject of the learning path
 *         resources:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               resourceId:
 *                 type: string
 *               order:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [pending, completed, in-progress]
 */

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/learning-paths:
 *   post:
 *     summary: Create a new learning path
 *     tags: [Learning Paths]
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
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               resources:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     resourceId:
 *                       type: string
 *                     order:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Learning path created successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/', restrictTo('teacher', 'admin'), learningPathController.createLearningPath);

/**
 * @swagger
 * /api/learning-paths:
 *   get:
 *     summary: Get all learning paths
 *     tags: [Learning Paths]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of learning paths
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LearningPath'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/', restrictTo('teacher', 'admin'), learningPathController.getAllLearningPaths);

/**
 * @swagger
 * /api/learning-paths/{pathId}:
 *   get:
 *     summary: Get a learning path by ID
 *     tags: [Learning Paths]
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
 *         description: Learning path data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LearningPath'
 *       404:
 *         description: Learning path not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/:pathId', restrictTo('teacher', 'admin', 'student'), learningPathController.getLearningPath);

/**
 * @swagger
 * /api/learning-paths/{pathId}:
 *   put:
 *     summary: Update a learning path
 *     tags: [Learning Paths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pathId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the learning path
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               resources:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Learning path updated successfully
 *       404:
 *         description: Learning path not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.put('/:pathId', restrictTo('teacher', 'admin'), learningPathController.updateLearningPath);

/**
 * @swagger
 * /api/learning-paths/{pathId}:
 *   delete:
 *     summary: Delete a learning path
 *     tags: [Learning Paths]
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
 *         description: Learning path deleted successfully
 *       404:
 *         description: Learning path not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.delete('/:pathId', restrictTo('teacher', 'admin'), learningPathController.deleteLearningPath);

/**
 * @swagger
 * /api/learning-paths/{pathId}/resources/{resourceId}:
 *   put:
 *     summary: Update resource status in a learning path
 *     tags: [Learning Paths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pathId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the learning path
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, in-progress]
 *     responses:
 *       200:
 *         description: Resource status updated successfully
 *       404:
 *         description: Learning path or resource not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.put('/:pathId/resources/:resourceId', restrictTo('student'), learningPathController.updateResourceStatus);
module.exports = router;