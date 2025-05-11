const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: User dashboard data and management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Dashboard:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Dashboard ID
 *         userId:
 *           type: string
 *           description: User ID the dashboard belongs to
 *         stats:
 *           type: object
 *           properties:
 *             completedResources:
 *               type: integer
 *             quizScores:
 *               type: array
 *               items:
 *                 type: object
 *             activityStats:
 *               type: object
 */

/**
 * @swagger
 * /api/dashboard/{id}:
 *   get:
 *     summary: Get dashboard data for a user
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dashboard'
 *       404:
 *         description: Dashboard not found
 *       500:
 *         description: Server error
 */
router.get('/:id', dashboardController.getDashboard);

/**
 * @swagger
 * /api/dashboard/goals/{userId}:
 *   get:
 *     summary: Get goals for a user
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User goals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   deadline:
 *                     type: string
 *                     format: date-time
 *                   completed:
 *                     type: boolean
 *       404:
 *         description: Goals not found
 *       500:
 *         description: Server error
 */
router.get('/goals/:userId', dashboardController.getGoals);

/**
 * @swagger
 * /api/dashboard/goals/{userId}:
 *   put:
 *     summary: Update goals for a user
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               goals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     deadline:
 *                       type: string
 *                       format: date-time
 *                     completed:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Goals updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/goals/:userId', dashboardController.updateGoals);

/**
 * @swagger
 * /api/dashboard/sessions/upcoming:
 *   get:
 *     summary: Get upcoming sessions for the user
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: List of upcoming sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date-time
 *                   type:
 *                     type: string
 *                   groupId:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/sessions/upcoming', dashboardController.getUpcomingSessions);

module.exports = router;

