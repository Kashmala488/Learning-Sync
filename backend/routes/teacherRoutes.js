const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

router.get('/students/progress', authMiddleware, restrictTo('teacher'), teacherController.getAllStudentsProgress);
router.get('/classes', authMiddleware, restrictTo('teacher'), teacherController.getClasses);
router.post('/message', authMiddleware, restrictTo('teacher'), teacherController.sendMessage);
router.get('/messages', authMiddleware, restrictTo('teacher'), teacherController.getMessages);
router.put('/messages/:messageId/read', authMiddleware, restrictTo('teacher'), teacherController.markMessageRead);
router.get('/notifications', authMiddleware, restrictTo('teacher'), teacherController.getNotifications);
router.put('/notifications/:notificationId/read', authMiddleware, restrictTo('teacher'), teacherController.markNotificationRead);
router.get('/analytics', authMiddleware, restrictTo('teacher'), teacherController.getAnalytics);
router.get('/learning-paths', authMiddleware, restrictTo('teacher'), teacherController.getLearningPaths);

router.get('/track/:studentId', authMiddleware, restrictTo('teacher'), teacherController.trackProgress);
router.get('/:teacherId', authMiddleware, restrictTo('teacher'), teacherController.getTeacherInfo);

router.post('/add', authMiddleware, restrictTo('admin'), teacherController.addTeacher);
router.delete('/delete/:teacherId', authMiddleware, restrictTo('admin'), teacherController.deleteTeacher);
router.post('/assign', authMiddleware, restrictTo('teacher'), teacherController.assignResource);
router.post('/learning-path', authMiddleware, restrictTo('teacher'), teacherController.createLearningPath);

module.exports = router;