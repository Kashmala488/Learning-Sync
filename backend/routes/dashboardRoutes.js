const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/:id', dashboardController.getDashboard);
router.get('/goals/:userId', dashboardController.getGoals);
router.put('/goals/:userId', dashboardController.updateGoals);
router.get('/sessions/upcoming', dashboardController.getUpcomingSessions);

module.exports = router;

