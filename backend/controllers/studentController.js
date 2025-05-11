const User = require('../models/User');
const LearningPath = require('../models/LearningPath');
const QuizResult = require('../models/QuizResult');
const Resource = require('../models/Resource');
const StudentMood = require('../models/studentMood');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Group = require('../models/Group');
const asyncHandler = require('express-async-handler');

// Add new dashboard data function
exports.getDashboardData = async (req, res) => {
  try {
    const studentId = req.user._id;
    if (!studentId) {
      console.error('Student ID missing from request:', req.user);
      return res.status(400).json({ error: 'Student ID is required' });
    }

    console.log('Fetching dashboard data for student:', studentId);
    
    try {
      // Get all data in parallel for better performance
      const [allLearningPaths, analytics, resources, studentMood] = await Promise.all([
        // Get learning paths
        LearningPath.find({ studentId })
          .populate('teacherId', 'name')
          .populate('resources.resourceId')
          .populate('quizzes.quizId')
          .catch(err => {
            console.error('Error fetching learning paths:', err);
            return [];
          }),
        
        // Get analytics data
        (async () => {
          try {
            // Get quiz results
            const quizResults = await QuizResult.find({ userId: studentId })
              .populate('quizId', 'title subject difficulty')
              .catch(err => {
                console.error('Error fetching quiz results:', err);
                return [];
              });
            
            // Get all learning paths for analytics
            const allPaths = await LearningPath.find({ studentId })
              .catch(err => {
                console.error('Error fetching learning paths for analytics:', err);
                return [];
              });
            
            // Calculate analytics with default values if data is missing
            const quizAnalytics = {
              totalQuizzes: quizResults.length,
              averageScore: quizResults.reduce((acc, result) => acc + (result.score || 0), 0) / 
                          (quizResults.length || 1),
              bySubject: {},
              byDifficulty: {
                easy: { count: 0, avgScore: 0 },
                medium: { count: 0, avgScore: 0 },
                hard: { count: 0, avgScore: 0 }
              }
            };
            
            // Group by subject (with error handling)
            quizResults.forEach(result => {
              if (result.quizId) {
                const subject = result.quizId.subject;
                const difficulty = result.quizId.difficulty;
                
                if (subject) {
                  // By subject
                  if (!quizAnalytics.bySubject[subject]) {
                    quizAnalytics.bySubject[subject] = {
                      count: 0,
                      avgScore: 0,
                      totalScore: 0
                    };
                  }
                  quizAnalytics.bySubject[subject].count++;
                  quizAnalytics.bySubject[subject].totalScore += (result.score || 0);
                  quizAnalytics.bySubject[subject].avgScore = 
                    quizAnalytics.bySubject[subject].totalScore / quizAnalytics.bySubject[subject].count;
                }
                
                // By difficulty
                if (difficulty && quizAnalytics.byDifficulty[difficulty]) {
                  quizAnalytics.byDifficulty[difficulty].count++;
                  quizAnalytics.byDifficulty[difficulty].avgScore = 
                    (quizAnalytics.byDifficulty[difficulty].avgScore * 
                     (quizAnalytics.byDifficulty[difficulty].count - 1) + 
                     (result.score || 0)) / quizAnalytics.byDifficulty[difficulty].count;
                }
              }
            });
            
            // Learning path progress
            const learningPathAnalytics = {
              totalPaths: allPaths.length,
              activePaths: allPaths.filter(path => path.status === 'active').length,
              completedPaths: allPaths.filter(path => path.status === 'completed').length,
              averageProgress: allPaths.reduce((acc, path) => acc + (path.progress || 0), 0) /
                             (allPaths.length || 1)
            };
            
            return {
              quizAnalytics,
              learningPathAnalytics
            };
          } catch (err) {
            console.error('Error in analytics calculation:', err);
            return {
              quizAnalytics: { totalQuizzes: 0, averageScore: 0, bySubject: {}, byDifficulty: {} },
              learningPathAnalytics: { totalPaths: 0, activePaths: 0, completedPaths: 0, averageProgress: 0 }
            };
          }
        })(),
        
        // Get recommended resources (limited to 4)
        Resource.find()
          .populate('sharedBy', 'name')
          .sort({ createdAt: -1 })
          .limit(4)
          .catch(err => {
            console.error('Error fetching recommended resources:', err);
            return [];
          }),
        
        // Get student mood
        StudentMood.findOne({ studentId })
          .sort({ createdAt: -1 })
          .limit(1)
          .catch(err => {
            console.error('Error fetching student mood:', err);
            return null;
          })
      ]);
      
      // Filter learning paths with resources and limit to 3
      const learningPaths = (allLearningPaths || [])
        .filter(path => path && path.resources && path.resources.length > 0)
        .map(path => ({
          ...path.toObject(),
          status: path.progress === 100 ? 'completed' : 'active'
        }))
        .slice(0, 3);
      
      // Respond with combined dashboard data
      res.status(200).json({
        learningPaths,
        analytics,
        recommendations: resources || [],
        mood: studentMood,
      });
    } catch (err) {
      console.error('Error in Promise.all:', err);
      res.status(500).json({ error: 'Error fetching dashboard data' });
    }
  } catch (err) {
    console.error('Error in getDashboardData:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get learning paths assigned to a student
exports.getLearningPaths = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Clean up any duplicate learning paths that might exist
    await cleanupDuplicatePaths(studentId);
    
    const allLearningPaths = await LearningPath.find({ studentId })
      .populate('teacherId', 'name')
      .populate('resources.resourceId')
      .populate('quizzes.quizId');
    
    // Filter out learning paths that don't have any resources
    const validLearningPaths = allLearningPaths.filter(path => 
      path.resources && path.resources.length > 0
    );
    
    // Update status for any paths with progress = 100%
    const updatedPaths = await Promise.all(validLearningPaths.map(async (path) => {
      let needsUpdate = false;
      
      // Ensure status is correct based on progress
      if (path.progress === 100 && path.status !== 'completed') {
        path.status = 'completed';
        needsUpdate = true;
      } else if (path.progress < 100 && path.status === 'completed') {
        path.status = 'active';
        needsUpdate = true;
      }
      
      // Save the path if status needed updating
      if (needsUpdate) {
        await path.save();
      }
      
      return path;
    }));
    
    res.status(200).json(updatedPaths);
  } catch (err) {
    console.error('Error fetching learning paths:', err);
    res.status(500).json({ error: err.message });
  }
};

// Helper function to clean up duplicate learning paths
const cleanupDuplicatePaths = async (studentId) => {
  try {
    const paths = await LearningPath.find({ studentId });
    const pathsByTitle = {};
    const duplicatesToRemove = [];
    
    // Group paths by title and find duplicates
    paths.forEach(path => {
      if (!pathsByTitle[path.title]) {
        pathsByTitle[path.title] = path;
      } else {
        // If we already have a path with this title, keep the one with more resources
        const existingPath = pathsByTitle[path.title];
        if (path.resources.length > existingPath.resources.length) {
          duplicatesToRemove.push(existingPath._id);
          pathsByTitle[path.title] = path;
        } else {
          duplicatesToRemove.push(path._id);
        }
      }
    });
    
    // Remove duplicates if any found
    if (duplicatesToRemove.length > 0) {
      await LearningPath.deleteMany({ _id: { $in: duplicatesToRemove } });
      console.log(`Cleaned up ${duplicatesToRemove.length} duplicate learning paths for student ${studentId}`);
    }
  } catch (err) {
    console.error('Error cleaning up duplicate paths:', err);
  }
};

// Get a specific learning path
exports.getLearningPath = async (req, res) => {
  try {
    const { pathId } = req.params;
    const studentId = req.user._id;
    
    const learningPath = await LearningPath.findOne({ 
      _id: pathId, 
      studentId 
    })
      .populate('teacherId', 'name')
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

// Get student performance analytics
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Get quiz results
    const quizResults = await QuizResult.find({ userId: studentId })
      .populate('quizId', 'title subject difficulty');
    
    // Get learning paths
    const learningPaths = await LearningPath.find({ studentId });
    
    // Calculate analytics
    const quizAnalytics = {
      totalQuizzes: quizResults.length,
      averageScore: quizResults.reduce((acc, result) => acc + result.score, 0) / 
                    (quizResults.length || 1),
      bySubject: {},
      byDifficulty: {
        easy: { count: 0, avgScore: 0 },
        medium: { count: 0, avgScore: 0 },
        hard: { count: 0, avgScore: 0 }
      }
    };
    
    // Group by subject
    quizResults.forEach(result => {
      if (result.quizId) {
        const subject = result.quizId.subject;
        const difficulty = result.quizId.difficulty;
        
        // By subject
        if (!quizAnalytics.bySubject[subject]) {
          quizAnalytics.bySubject[subject] = {
            count: 0,
            avgScore: 0,
            totalScore: 0
          };
        }
        quizAnalytics.bySubject[subject].count++;
        quizAnalytics.bySubject[subject].totalScore += result.score;
        quizAnalytics.bySubject[subject].avgScore = 
          quizAnalytics.bySubject[subject].totalScore / quizAnalytics.bySubject[subject].count;
        
        // By difficulty
        if (difficulty) {
          quizAnalytics.byDifficulty[difficulty].count++;
          quizAnalytics.byDifficulty[difficulty].avgScore = 
            (quizAnalytics.byDifficulty[difficulty].avgScore * 
             (quizAnalytics.byDifficulty[difficulty].count - 1) + 
             result.score) / quizAnalytics.byDifficulty[difficulty].count;
        }
      }
    });
    
    // Learning path progress
    const learningPathAnalytics = {
      totalPaths: learningPaths.length,
      activePaths: learningPaths.filter(path => path.status === 'active').length,
      completedPaths: learningPaths.filter(path => path.status === 'completed').length,
      averageProgress: learningPaths.reduce((acc, path) => acc + path.progress, 0) /
                       (learningPaths.length || 1)
    };
    
    res.status(200).json({
      quizAnalytics,
      learningPathAnalytics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get recommended learning resources
exports.getRecommendedResources = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Get quiz results to identify weak areas
    const quizResults = await QuizResult.find({ userId: studentId })
      .populate('quizId', 'subject');
    
    // Calculate weak subjects
    const subjectScores = {};
    quizResults.forEach(result => {
      if (result.quizId && result.quizId.subject) {
        const subject = result.quizId.subject;
        if (!subjectScores[subject]) {
          subjectScores[subject] = {
            totalScore: 0,
            count: 0
          };
        }
        subjectScores[subject].totalScore += result.score;
        subjectScores[subject].count++;
      }
    });
    
    // Sort subjects by average score (ascending)
    const weakSubjects = Object.keys(subjectScores)
      .map(subject => ({
        subject,
        avgScore: subjectScores[subject].totalScore / subjectScores[subject].count
      }))
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 3) // Get top 3 weak subjects
      .map(item => item.subject);
    
    // Get resources related to weak subjects
    const resources = await Resource.find()
      .populate('sharedBy', 'name');
    
    // Filter and rank resources (simple implementation - in reality would use ML)
    const recommendedResources = resources
      .filter(resource => {
        const title = resource.title.toLowerCase();
        return weakSubjects.some(subject => title.includes(subject.toLowerCase()));
      })
      .slice(0, 5); // Limit to top 5
    
    res.status(200).json(recommendedResources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Set student mood/emotional state
exports.setMood = async (req, res) => {
  try {
    const { mood, stress, energy } = req.body;
    const studentId = req.user._id;
    
    // Update or create student's mood data
    let studentMood = await StudentMood.findOne({ studentId });
    
    if (!studentMood) {
      studentMood = new StudentMood({
        studentId,
        mood,
        stress,
        energy,
        history: [{ mood, stress, energy, timestamp: new Date() }]
      });
    } else {
      studentMood.mood = mood;
      studentMood.stress = stress;
      studentMood.energy = energy;
      studentMood.history.push({ mood, stress, energy, timestamp: new Date() });
      
      // Limit history to last 30 entries
      if (studentMood.history.length > 30) {
        studentMood.history = studentMood.history.slice(-30);
      }
    }
    
    await studentMood.save();
    
    res.status(200).json(studentMood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get nearby students for current user
exports.getNearbyStudents = async (req, res) => {
  try {
    const userId = req.user._id;
    const maxDistance = req.query.distance ? parseInt(req.query.distance) : 10000; // Default 10km

    // Get current user with location
    const currentUser = await User.findById(userId);
    
    if (!currentUser || !currentUser.location || !currentUser.location.coordinates || 
        currentUser.location.coordinates[0] === 0 && currentUser.location.coordinates[1] === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Your location is not available" 
      });
    }

    // Find nearby students
    const nearbyStudents = await User.find({
      _id: { $ne: userId }, // Exclude current user
      role: 'student',
      'location.locationSharing': true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: currentUser.location.coordinates
          },
          $maxDistance: maxDistance // in meters
        }
      }
    }).select('name email profilePicture location').limit(50);

    return res.status(200).json({
      success: true,
      data: {
        currentUser: {
          location: currentUser.location,
          name: currentUser.name,
          id: currentUser._id
        },
        nearbyStudents
      }
    });
  } catch (error) {
    console.error('Error finding nearby students:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Messaging with mentors
exports.sendMessage = async (req, res) => {
  try {
    const { mentorId, content, parentMessageId } = req.body;

    if (!mentorId || !content) {
      return res.status(400).json({ error: 'Mentor ID and content are required' });
    }

    // Verify that the mentor is a teacher
    const mentor = await User.findOne({
      _id: mentorId,
      role: 'teacher'
    });

    if (!mentor) {
      return res.status(400).json({ error: 'Invalid mentor ID' });
    }

    const message = await Message.create({
      senderId: req.user._id,
      recipientIds: [mentorId],
      content,
      parentMessageId: parentMessageId || null,
      isRead: []
    });

    // Create notification for the mentor
    await Notification.create({
      userId: mentorId,
      type: 'message',
      content: `New message from student ${req.user.name}`,
      relatedId: message._id,
      isRead: false
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        id: message._id,
        sender: { id: req.user._id, name: req.user.name },
        recipients: [{ id: mentor._id, name: mentor.name }],
        content: message.content,
        createdAt: message.createdAt
      }
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id },
        { recipientIds: req.user._id }
      ]
    })
      .populate('senderId', 'name profilePicture')
      .populate('recipientIds', 'name profilePicture')
      .populate({
        path: 'parentMessageId',
        populate: {
          path: 'senderId',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Verify the user is a recipient of this message
    if (!message.recipientIds.includes(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to mark this message as read' });
    }

    // Add user to the "read" list if not already there
    if (!message.isRead.includes(req.user._id)) {
      message.isRead.push(req.user._id);
      await message.save();
    }
    
    res.status(200).json({ message: 'Message marked as read' });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.user._id 
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create multiple notifications (e.g., for video call notifications)
exports.createNotifications = asyncHandler(async (req, res) => {
  const notifications = req.body;

  if (!Array.isArray(notifications) || notifications.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty notifications array' });
  }

  // Validate each notification
  for (const notif of notifications) {
    if (!notif.userId || !notif.type || !notif.content || !notif.relatedId) {
      return res.status(400).json({ error: 'Missing required fields in notification' });
    }

    // Verify user exists
    const user = await User.findById(notif.userId);
    if (!user) {
      return res.status(404).json({ error: `User not found: ${notif.userId}` });
    }

    // Verify group exists (relatedId is a Group ID)
    const group = await Group.findById(notif.relatedId);
    if (!group) {
      return res.status(404).json({ error: `Group not found: ${notif.relatedId}` });
    }

    // Validate type
    if (!['message', 'resource', 'quiz', 'other', 'video_call'].includes(notif.type)) {
      return res.status(400).json({ error: `Invalid notification type: ${notif.type}` });
    }
  }

  // Save notifications to database
  try {
    const createdNotifications = await Notification.insertMany(
      notifications.map(notif => ({
        userId: notif.userId,
        type: notif.type,
        content: notif.content,
        relatedId: notif.relatedId,
        isRead: notif.isRead || false,
      }))
    );

    res.status(200).json({ message: 'Notifications created successfully', count: createdNotifications.length });
  } catch (err) {
    console.error('Error creating notifications:', err);
    res.status(500).json({ error: 'Failed to create notifications' });
  }
});

// Sync resources with learning paths to ensure all resources have a learning path
exports.syncResourcesWithLearningPaths = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all resources created by this user
    const resources = await Resource.find({ sharedBy: userId });
    
    if (!resources || resources.length === 0) {
      return res.status(200).json({ message: 'No resources found to sync' });
    }
    
    // Get all learning paths for this user
    const learningPaths = await LearningPath.find({ studentId: userId });
    
    // Track resources that are already in a learning path
    const resourcesInPaths = new Set();
    learningPaths.forEach(path => {
      path.resources.forEach(resource => {
        if (resource.resourceId) {
          resourcesInPaths.add(resource.resourceId.toString());
        }
      });
    });
    
    // Group resources by subject/category
    const resourcesBySubject = {};
    
    resources.forEach(resource => {
      // Skip resources that are already in a learning path
      if (resourcesInPaths.has(resource._id.toString())) {
        return;
      }
      
      // Extract subject from title
      const subject = resource.title.split(':')[0].trim() || 'General';
      
      if (!resourcesBySubject[subject]) {
        resourcesBySubject[subject] = [];
      }
      
      resourcesBySubject[subject].push(resource);
    });
    
    // Create learning paths for resources not yet in a path
    const newPaths = [];
    const processedSubjects = new Set(); // Track which subjects we've processed
    
    for (const [subject, subjectResources] of Object.entries(resourcesBySubject)) {
      if (subjectResources.length > 0 && !processedSubjects.has(subject)) {
        processedSubjects.add(subject); // Mark this subject as processed
        
        // Check if there's an existing path for this subject
        const existingPath = learningPaths.find(path => 
          path.title === `Learning Path: ${subject}`
        );
        
        if (existingPath) {
          // Add resources to existing path, but first ensure no duplicates
          const existingResourceIds = new Set(
            existingPath.resources
              .filter(r => r.resourceId)
              .map(r => r.resourceId.toString())
          );
          
          // Only add resources that aren't already in the path
          const newResources = subjectResources.filter(
            resource => !existingResourceIds.has(resource._id.toString())
          );
          
          if (newResources.length > 0) {
            const resourcesToAdd = newResources.map((resource, idx) => ({
              resourceId: resource._id,
              completed: false,
              order: existingPath.resources.length + idx + 1
            }));
            
            existingPath.resources.push(...resourcesToAdd);
            
            // Recalculate progress
            const totalItems = existingPath.resources.length + existingPath.quizzes.length;
            const completedResources = existingPath.resources.filter(r => r.completed).length;
            const completedQuizzes = existingPath.quizzes.filter(q => q.completed).length;
            
            existingPath.progress = totalItems > 0 
              ? Math.round(((completedResources + completedQuizzes) / totalItems) * 100) 
              : 0;
              
            await existingPath.save();
            newPaths.push(existingPath);
          }
        } else {
          // Create new learning path
          const pathResources = subjectResources.map((resource, index) => ({
            resourceId: resource._id,
            completed: false,
            order: index + 1
          }));
          
          const newPath = await LearningPath.create({
            title: `Learning Path: ${subject}`,
            description: `A personalized learning path about ${subject}`,
            teacherId: userId, // Student is both teacher and student for self-generated resources
            studentId: userId,
            resources: pathResources,
            quizzes: [],
            status: 'active',
            progress: 0
          });
          
          newPaths.push(newPath);
        }
      }
    }
    
    // Clean up any duplicate paths that might have been created previously
    const pathTitles = new Set();
    const duplicatePaths = [];
    
    for (const path of await LearningPath.find({ studentId: userId })) {
      if (pathTitles.has(path.title)) {
        duplicatePaths.push(path._id);
      } else {
        pathTitles.add(path.title);
      }
    }
    
    if (duplicatePaths.length > 0) {
      await LearningPath.deleteMany({ _id: { $in: duplicatePaths } });
      console.log(`Deleted ${duplicatePaths.length} duplicate learning paths`);
    }
    
    res.status(200).json({
      message: `Successfully synced ${Object.keys(resourcesBySubject).length} subjects with learning paths`,
      newPaths
    });
  } catch (err) {
    console.error('Error syncing resources with learning paths:', err);
    res.status(500).json({ error: err.message });
  }
};