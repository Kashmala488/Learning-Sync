const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authMiddleware, restrictTo } = require('../../backend/middleware/authMiddleware');

// Apply authentication to all routes
router.use(authMiddleware);

// Group management routes
router.get('/', groupController.getAllGroups);
router.post('/create', groupController.createGroup);
router.get('/:groupId', groupController.getGroup);
router.post('/:groupId/join', groupController.joinGroup);
router.post('/:groupId/leave', groupController.leaveGroup);
router.delete('/:groupId', restrictTo('admin'), groupController.deleteGroup);

// Group messaging
router.post('/:groupId/message', groupController.sendMessage);
router.post('/:groupId/message/file', groupController.sendMessageWithFile);
router.get('/:groupId/messages', groupController.getGroupMessages);

// Teacher mentoring routes
router.get('/mentor/available', restrictTo('teacher'), groupController.getGroupsWithoutMentorForTeacher);
router.get('/mentor/my-groups', restrictTo('teacher'), groupController.getTeacherMentoredGroups);
router.post('/:groupId/mentor/assign', restrictTo('teacher'), groupController.assignMentor);
router.post('/:groupId/mentor/unassign', restrictTo('teacher'), groupController.unassignMentor);

// AI recommendation
router.get('/recommendations/find', groupController.findRecommendedGroups);

module.exports = router;