const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

router.get('/users', authMiddleware, restrictTo('admin'), adminController.getAllUsers);
router.put('/user/role', authMiddleware, restrictTo('admin'), adminController.updateUserRole);
router.delete('/users/:userId', authMiddleware, restrictTo('admin'), adminController.deleteUser);
router.get('/moderate', authMiddleware, restrictTo('admin'), adminController.getModerationQueue);
router.post('/moderate/:contentId', authMiddleware, restrictTo('admin'), adminController.moderateContent);
router.get('/reports', authMiddleware, restrictTo('admin'), adminController.generateReports);
router.get('/settings', authMiddleware, restrictTo('admin'), adminController.getSettings);
router.put('/settings', authMiddleware, restrictTo('admin'), adminController.updateSettings);
router.get('/security-alerts', authMiddleware, restrictTo('admin'), adminController.getSecurityAlerts);
router.put('/security-alerts/:alertId/view', authMiddleware, restrictTo('admin'), adminController.markAlertAsViewed);
router.get('/analytics', authMiddleware, restrictTo('admin'), adminController.getDetailedAnalytics);

module.exports = router;