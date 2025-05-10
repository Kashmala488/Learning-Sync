const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authMiddleware);

// Video management routes
router.get('/', videoController.getAllVideos);
router.post('/upload', restrictTo('teacher', 'admin'), videoController.uploadVideo);
router.get('/:videoId', videoController.getVideo);
router.delete('/:videoId', restrictTo('teacher', 'admin'), videoController.deleteVideo);

// Comment routes
router.post('/:videoId/comments', videoController.createComment);
router.get('/:videoId/comments', videoController.getComments);
router.delete('/:videoId/comments/:commentId', videoController.deleteComment);

// Engagement tracking
router.post('/:videoId/engagement', videoController.trackEngagement);

// Recommendations
router.get('/recommendations/find', videoController.getRecommendedVideos);

module.exports = router;