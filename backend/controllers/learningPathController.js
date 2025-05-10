const LearningPath = require('../models/LearningPath');

// Get all learning paths (teacher or admin)
exports.getAllLearningPaths = async (req, res) => {
  try {
    let query = {};
    
    // If teacher, only get paths created by this teacher
    if (req.user.role === 'teacher') {
      query.teacherId = req.user._id;
    }
    
    const learningPaths = await LearningPath.find(query)
      .populate('teacherId', 'name')
      .populate('studentId', 'name')
      .populate('resources.resourceId')
      .populate('quizzes.quizId');
    
    res.status(200).json(learningPaths);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a specific learning path
exports.getLearningPath = async (req, res) => {
  try {
    const { pathId } = req.params;
    
    let query = { _id: pathId };
    
    // If teacher, only get paths created by this teacher
    if (req.user.role === 'teacher') {
      query.teacherId = req.user._id;
    }
    
    const learningPath = await LearningPath.findOne(query)
      .populate('teacherId', 'name')
      .populate('studentId', 'name')
      .populate('resources.resourceId')
      .populate('quizzes.quizId');
    
    if (!learningPath) {
      return res.status(404).json({ error: 'Learning path not found' });
    }
    
    res.status(200).json(learningPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a learning path
exports.updateLearningPath = async (req, res) => {
  try {
    const { pathId } = req.params;
    const { title, description, resources, quizzes, status, deadline } = req.body;
    
    let query = { _id: pathId };
    
    // If teacher, only update paths created by this teacher
    if (req.user.role === 'teacher') {
      query.teacherId = req.user._id;
    }
    
    const learningPath = await LearningPath.findOne(query);
    
    if (!learningPath) {
      return res.status(404).json({ error: 'Learning path not found' });
    }
    
    // Update fields
    if (title) learningPath.title = title;
    if (description) learningPath.description = description;
    if (resources) learningPath.resources = resources;
    if (quizzes) learningPath.quizzes = quizzes;
    if (status) learningPath.status = status;
    if (deadline) learningPath.deadline = deadline;
    
    await learningPath.save();
    
    res.status(200).json(learningPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Add this to the learningPathController.js
exports.createLearningPath = async (req, res) => {
  try {
    const { studentId, title, description, resources, quizzes, deadline } = req.body;
    
    if (!studentId || !title) {
      return res.status(400).json({ error: 'Student ID and title are required' });
    }
    
    const learningPath = await LearningPath.create({
      teacherId: req.user._id,
      studentId,
      title,
      description,
      resources: resources || [],
      quizzes: quizzes || [],
      deadline,
      progress: 0,
      status: 'active'
    });
    
    // Populate related data for the response
    const populatedPath = await LearningPath.findById(learningPath._id)
      .populate('teacherId', 'name')
      .populate('studentId', 'name');
    
    res.status(201).json(populatedPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateResourceStatus = async (req, res) => {
  try {
    const { pathId, resourceId } = req.params;
    const { completed } = req.body;
    const studentId = req.user._id;
    
    // Find the learning path for this student
    const learningPath = await LearningPath.findOne({ 
      _id: pathId, 
      studentId
    });
    
    if (!learningPath) {
      return res.status(404).json({ error: 'Learning path not found or not assigned to you' });
    }
    
    // Find the resource in the learning path
    const resourceIndex = learningPath.resources.findIndex(
      resource => resource.resourceId.toString() === resourceId
    );
    
    if (resourceIndex === -1) {
      return res.status(404).json({ error: 'Resource not found in learning path' });
    }
    
    // Update the completed status
    learningPath.resources[resourceIndex].completed = completed;
    
    // Calculate overall progress
    const totalResources = learningPath.resources.length;
    const completedResources = learningPath.resources.filter(r => r.completed).length;
    const totalQuizzes = learningPath.quizzes.length;
    const completedQuizzes = learningPath.quizzes.filter(q => q.completed).length;
    
    const progressPercentage = totalResources + totalQuizzes > 0 
      ? ((completedResources + completedQuizzes) / (totalResources + totalQuizzes)) * 100 
      : 0;
    
    learningPath.progress = Math.round(progressPercentage);
    
    await learningPath.save();
    
    // Return the updated learning path with populated data
    const updatedPath = await LearningPath.findById(pathId)
      .populate('teacherId', 'name')
      .populate('studentId', 'name')
      .populate('resources.resourceId')
      .populate('quizzes.quizId');
    
    res.status(200).json(updatedPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Delete a learning path
exports.deleteLearningPath = async (req, res) => {
  try {
    const { pathId } = req.params;
    
    let query = { _id: pathId };
    
    // If teacher, only delete paths created by this teacher
    if (req.user.role === 'teacher') {
      query.teacherId = req.user._id;
    }
    
    const result = await LearningPath.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Learning path not found or not authorized' });
    }
    
    res.status(200).json({ message: 'Learning path deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};