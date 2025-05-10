const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Routes for both teachers and admins
router.post('/', restrictTo('teacher', 'admin'), learningPathController.createLearningPath);
router.get('/', restrictTo('teacher', 'admin'), learningPathController.getAllLearningPaths);
router.get('/:pathId', restrictTo('teacher', 'admin', 'student'), learningPathController.getLearningPath);
router.put('/:pathId', restrictTo('teacher', 'admin'), learningPathController.updateLearningPath);
router.delete('/:pathId', restrictTo('teacher', 'admin'), learningPathController.deleteLearningPath);
router.put('/:pathId/resources/:resourceId', restrictTo('student'), learningPathController.updateResourceStatus);
module.exports = router;