const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authMiddleware);

// Resource management routes
router.get('/my-resources', resourceController.getUserResources);
router.get('/', resourceController.getAllResources);
router.get('/:resourceId', resourceController.getResource);
router.post('/share', resourceController.shareResource);
router.post('/:resourceId/share', resourceController.shareResourceWithGroups);
router.put('/:resourceId', resourceController.updateResource);
router.delete('/:resourceId', resourceController.deleteResource);

// Rating route
router.post('/:resourceId/rate', resourceController.rateResource);

// Mark resource as complete route
router.post('/:resourceId/complete', resourceController.markResourceComplete);

// AI generation
router.post('/generate', resourceController.generateAIResource);

module.exports = router;