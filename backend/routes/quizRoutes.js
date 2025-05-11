const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheMiddleware } = require('../middleware/cacheMiddleware');
const Group = require('../models/Group');

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz management and generation
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Quiz:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Quiz ID
 *         title:
 *           type: string
 *           description: Quiz title
 *         questions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *         createdBy:
 *           type: string
 *           description: ID of user who created the quiz
 *         groupId:
 *           type: string
 *           description: ID of the associated group
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 */

// Authentication applied to all routes
router.use(authMiddleware);

// Debug routes - no caching needed
router.get('/debug/user-role', (req, res) => {
  console.log('User debug request from:', req.user.email, 'Role:', req.user.role);
  res.status(200).json({
    role: req.user.role,
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    roles_allowed: ['student'] // The roles allowed for student quiz generation
  });
});

router.get('/debug/group-membership/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const isMember = group.members.some(memberId => 
      memberId.toString() === userId.toString()
    );
    
    res.status(200).json({
      userId: userId.toString(),
      groupId,
      isMember,
      memberIds: group.members.map(m => m.toString()),
      groupName: group.name,
      subject: group.subject
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Special unrestricted route for quiz generation (bypass role check) - no caching as it's a POST
router.post('/generate-no-restrict/:groupId', async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { topic, difficulty, numberOfQuestions = 5 } = req.body;
    
    console.log(`No-restrict quiz generation attempt by user ${req.user.email} (${req.user.role}) for group ${groupId}`);

    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is a member of the group (don't check role)
    const isMember = group.members.some(memberId => 
      memberId.toString() === userId.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ 
        error: 'You are not a member of this group',
        userId: userId.toString(),
        groupMembers: group.members.map(m => m.toString())
      });
    }

    // Call the quiz controller method with req and res
    await quizController.generateAIQuiz(req, res);
  } catch (err) {
    console.error('Error in no-restrict route:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/quizzes/student/create:
 *   post:
 *     summary: Create a student quiz
 *     tags: [Quizzes]
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
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/student/create', restrictTo('student'), 
  clearCacheMiddleware('cache:*:*/api/quizzes*'), 
  quizController.createStudentQuiz);

/**
 * @swagger
 * /api/quizzes/student/generate-ai/{groupId}:
 *   post:
 *     summary: Generate an AI quiz for a student
 *     tags: [Quizzes]
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
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               numberOfQuestions:
 *                 type: integer
 *                 default: 5
 *     responses:
 *       200:
 *         description: AI quiz generated successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/student/generate-ai/:groupId', restrictTo('student'), quizController.generateAIQuiz);

/**
 * @swagger
 * /api/quizzes/generate/{userId}:
 *   post:
 *     summary: Generate a quiz for a specific user
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic:
 *                 type: string
 *               difficulty:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quiz generated successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/generate/:userId', restrictTo('student'), quizController.generateQuiz);

/**
 * @swagger
 * /api/quizzes/generate-from-resource:
 *   post:
 *     summary: Generate a quiz from a learning resource
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resourceId
 *             properties:
 *               resourceId:
 *                 type: string
 *               numberOfQuestions:
 *                 type: integer
 *                 default: 5
 *     responses:
 *       200:
 *         description: Quiz generated successfully from resource
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/generate-from-resource', restrictTo('student'), quizController.generateFromResource);

/**
 * @swagger
 * /api/quizzes/group/{groupId}/quizzes:
 *   get:
 *     summary: Get all quizzes for a group
 *     tags: [Quizzes]
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
 *         description: List of group quizzes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quiz'
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/group/:groupId/quizzes', restrictTo('student'), 
  cacheMiddleware(1800), 
  quizController.getGroupQuizzes);

/**
 * @swagger
 * /api/quizzes/student/results:
 *   get:
 *     summary: Get quiz results for a student
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of student quiz results
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/student/results', restrictTo('student'), 
  cacheMiddleware(1800), 
  quizController.getStudentQuizResults);

/**
 * @swagger
 * /api/quizzes/practice/{groupId}/questions:
 *   get:
 *     summary: Get practice questions for a group
 *     tags: [Quizzes]
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
 *         description: List of practice questions
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/practice/:groupId/questions', restrictTo('student'), 
  cacheMiddleware(1800), 
  quizController.getPracticeQuestions);

/**
 * @swagger
 * /api/quizzes/{quizId}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the quiz
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     answer:
 *                       type: string
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:quizId/submit', restrictTo('student'), 
  clearCacheMiddleware('cache:*:*/api/quizzes/student/results*'), 
  quizController.submitQuiz);

/**
 * @swagger
 * /api/quizzes/{quizId}/feedback:
 *   get:
 *     summary: Get feedback for a submitted quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the quiz
 *     responses:
 *       200:
 *         description: Quiz feedback
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/:quizId/feedback', restrictTo('student'), 
  cacheMiddleware(3600), 
  quizController.getFeedback);

/**
 * @swagger
 * /api/quizzes/{quizId}/flag:
 *   post:
 *     summary: Flag a question in a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the quiz
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *               - reason
 *             properties:
 *               questionId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Question flagged successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:quizId/flag', restrictTo('student'), quizController.flagQuestion);

/**
 * @swagger
 * /api/quizzes/{quizId}/hint:
 *   post:
 *     summary: Request a hint for a quiz question
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the quiz
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *             properties:
 *               questionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hint provided successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:quizId/hint', restrictTo('student'), quizController.requestHint);

/**
 * @swagger
 * /api/quizzes/{quizId}/progress:
 *   get:
 *     summary: Get progress indicator for a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the quiz
 *     responses:
 *       200:
 *         description: Quiz progress information
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/:quizId/progress', restrictTo('student'), 
  cacheMiddleware(300), 
  quizController.getProgressIndicator);

/**
 * @swagger
 * /api/quizzes/{quizId}/time-settings:
 *   post:
 *     summary: Configure time settings for a quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the quiz
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeLimit:
 *                 type: integer
 *                 description: Time limit in minutes
 *     responses:
 *       200:
 *         description: Time settings configured successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/:quizId/time-settings', restrictTo('student'), quizController.configureTimeSettings);

/**
 * @swagger
 * /api/quizzes/create:
 *   post:
 *     summary: Create a quiz (teacher/admin only)
 *     tags: [Quizzes]
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
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *               groupId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/create', restrictTo('teacher', 'admin'), 
  clearCacheMiddleware('cache:*:*/api/quizzes*'), 
  quizController.createQuiz);

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   get:
 *     summary: Get quiz by ID
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the quiz
 *     responses:
 *       200:
 *         description: Quiz data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       404:
 *         description: Quiz not found
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/:quizId', cacheMiddleware(1800), quizController.getQuiz);

module.exports = router;