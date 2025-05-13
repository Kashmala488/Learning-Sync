const express = require('express');
const router = express.Router();
const axios = require('axios');
const quizController = require('../controllers/quizController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

// Authentication applied to all routes
router.use(authMiddleware);

// Debug route to check user role
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

// Debug route to check group membership
router.get('/debug/group-membership/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    // Fetch group from Group Service
    const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
      headers: { Authorization: req.header('Authorization') }
    });
    const group = response.data.group;
    
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
    console.error('Error fetching group membership:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// Special unrestricted route for quiz generation (bypass role check)
router.post('/generate-no-restrict/:groupId', async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { topic, difficulty, numberOfQuestions = 5 } = req.body;
    
    console.log(`No-restrict quiz generation attempt by user ${req.user.email} (${req.user.role}) for group ${groupId}`);

    // Fetch group from Group Service
    const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
      headers: { Authorization: req.header('Authorization') }
    });
    const group = response.data.group;
    
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
    console.error('Error in no-restrict route:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// Student quiz routes
router.post('/student/create', restrictTo('student'), quizController.createStudentQuiz);
router.post('/student/generate-ai/:groupId', restrictTo('student'), quizController.generateAIQuiz);
router.post('/generate/:userId', restrictTo('student'), quizController.generateQuiz);
router.post('/generate-from-resource', restrictTo('student'), quizController.generateFromResource);
router.get('/group/:groupId/quizzes', restrictTo('student'), quizController.getGroupQuizzes);
router.get('/student/results', restrictTo('student'), quizController.getStudentQuizResults);
router.get('/practice/:groupId/questions', restrictTo('student'), quizController.getPracticeQuestions);
router.post('/:quizId/submit', restrictTo('student'), quizController.submitQuiz);
router.get('/:quizId/feedback', restrictTo('student'), quizController.getFeedback);
router.post('/:quizId/flag', restrictTo('student'), quizController.flagQuestion);
router.post('/:quizId/hint', restrictTo('student'), quizController.requestHint);
router.get('/:quizId/progress', restrictTo('student'), quizController.getProgressIndicator);
router.post('/:quizId/time-settings', restrictTo('student'), quizController.configureTimeSettings);

// Teacher and admin routes
router.post('/create', restrictTo('teacher', 'admin'), quizController.createQuiz);

// General routes
router.get('/:quizId', quizController.getQuiz);

module.exports = router;