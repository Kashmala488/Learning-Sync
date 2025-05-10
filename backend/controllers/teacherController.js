const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Resource = require('../models/Resource');
const LearningPath = require('../models/LearningPath');
const QuizResult = require('../models/QuizResult');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

exports.getLearningPaths = async (req, res) => {
  try {
    const learningPaths = await LearningPath.find({ teacherId: req.user._id })
      .populate('studentId', 'name')
      .populate('resources.resourceId')
      .populate('quizzes.quizId');
    res.status(200).json(learningPaths);
  } catch (err) {
    console.error('Error fetching learning paths:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.addTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    const newTeacher = new User({ name, email, password, role: 'teacher' });
    await newTeacher.save();
    await Teacher.create({ userId: newTeacher._id, studentProgress: [], classes: [] });
    res.status(201).json({ message: 'Teacher added successfully', teacher: newTeacher });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await User.findById(req.params.teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (teacher.role !== 'teacher') return res.status(403).json({ error: 'User is not a teacher' });
    await User.findByIdAndDelete(req.params.teacherId);
    await Teacher.deleteOne({ userId: req.params.teacherId });
    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTeacherInfo = async (req, res) => {
  try {
    const teacher = await User.findById(req.params.teacherId).select('-password');
    if (!teacher || teacher.role !== 'teacher') return res.status(403).json({ error: 'Not a teacher' });
    res.status(200).json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.trackProgress = async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacher = await Teacher.findOne({ userId: req.user._id })
      .populate('studentProgress.studentId', 'name')
      .populate('studentProgress.quizResults.quizId')
      .populate('studentProgress.resourceEngagement.resourceId');
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const studentProgress = teacher.studentProgress.find(sp => sp.studentId._id.toString() === studentId);
    if (!studentProgress) return res.status(404).json({ error: 'Student not assigned' });
    res.status(200).json(studentProgress);
  } catch (err) {
    console.error('Error tracking progress:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllStudentsProgress = async (req, res) => {
  try {
    console.log('Getting student progress for teacher:', req.user._id);
    let teacher = await Teacher.findOne({ userId: req.user._id })
      .populate('studentProgress.studentId', 'name email avatar')
      .populate('studentProgress.quizResults.quizId')
      .populate('studentProgress.resourceEngagement.resourceId');
    
    console.log('Teacher found:', teacher ? 'Yes' : 'No');
    
    if (!teacher) {
      console.log('Creating new teacher document for user:', req.user._id);
      teacher = await Teacher.create({
        userId: req.user._id,
        studentProgress: [],
        classes: []
      });
      console.log('New teacher document created:', teacher._id);
    }

    let formattedProgress = [];
    
    if (!teacher.studentProgress || teacher.studentProgress.length === 0) {
      console.log('No student progress found, fetching all students with role: student');
      const students = await User.find({ role: 'student' }).select('name email avatar');
      formattedProgress = students.map(student => ({
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        progress: 0,
        avatar: student.avatar || 'https://i.pravatar.cc/150',
        lastUpdated: null,
        quizResults: [],
        resourceEngagement: []
      }));
    } else {
      formattedProgress = teacher.studentProgress.map(sp => ({
        id: sp.studentId._id.toString(),
        name: sp.studentId.name,
        email: sp.studentId.email,
        progress: sp.quizResults.length > 0 
          ? Math.round(sp.quizResults.reduce((sum, qr) => sum + qr.score, 0) / sp.quizResults.length)
          : 0,
        avatar: sp.studentId.avatar || 'https://i.pravatar.cc/150',
        lastUpdated: sp.quizResults.length > 0 
          ? sp.quizResults[sp.quizResults.length - 1].completedAt 
          : null,
        quizResults: sp.quizResults,
        resourceEngagement: sp.resourceEngagement
      }));
    }

    console.log(`Returning ${formattedProgress.length} student progress records`);
    res.status(200).json(formattedProgress);
  } catch (err) {
    console.error('Error getting student progress:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.assignResource = async (req, res) => {
  try {
    const { studentId, title, content } = req.body;
    
    const resource = await Resource.create({
      title,
      content,
      sharedBy: req.user._id
    });

    await Teacher.findOneAndUpdate(
      { userId: req.user._id, 'studentProgress.studentId': { $ne: studentId } },
      { 
        $addToSet: { 
          studentProgress: { 
            studentId,
            resourceEngagement: [{ resourceId: resource._id, completed: false }],
            quizResults: []
          } 
        }
      },
      { new: true }
    );

    await Teacher.findOneAndUpdate(
      { userId: req.user._id, 'studentProgress.studentId': studentId },
      { 
        $push: { 
          'studentProgress.$.resourceEngagement': { resourceId: resource._id, completed: false }
        }
      },
      { new: true }
    );

    // Create notification for the student
    await Notification.create({
      userId: studentId,
      type: 'resource',
      content: `New learning resource assigned: ${title}`,
      relatedId: resource._id,
      isRead: false
    });

    res.status(201).json({
      message: 'Resource assigned successfully',
      resource
    });
  } catch (err) {
    console.error('Error assigning resource:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createLearningPath = async (req, res) => {
  try {
    const { studentId, title, resources, quizzes } = req.body;
    const learningPath = await LearningPath.create({
      teacherId: req.user._id,
      studentId,
      title,
      resources,
      quizzes,
      status: 'active'
    });

    await Teacher.findOneAndUpdate(
      { userId: req.user._id, 'studentProgress.studentId': { $ne: studentId } },
      { 
        $addToSet: { 
          studentProgress: { 
            studentId,
            resourceEngagement: [],
            quizResults: []
          } 
        }
      },
      { new: true }
    );

    // Create notification for the student
    await Notification.create({
      userId: studentId,
      type: 'resource',
      content: `New learning path assigned: ${title}`,
      relatedId: learningPath._id,
      isRead: false
    });

    res.status(201).json(learningPath);
  } catch (err) {
    console.error('Error creating learning path:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    const classes = teacher.classes || [];
    res.status(200).json(classes);
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { recipientIds, content, parentMessageId } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || !content) {
      return res.status(400).json({ error: 'Recipient IDs and content are required' });
    }

    const recipients = await User.find({
      _id: { $in: recipientIds.map(id => new mongoose.Types.ObjectId(id)) },
      role: 'student'
    });

    if (recipients.length !== recipientIds.length) {
      return res.status(400).json({ error: 'Invalid or non-student recipients' });
    }

    const message = await Message.create({
      senderId: req.user._id,
      recipientIds,
      content,
      parentMessageId: parentMessageId || null,
      isRead: []
    });

    const notifications = recipients.map(recipient => ({
      userId: recipient._id,
      type: 'message',
      content: `New message from ${req.user.name}`,
      relatedId: message._id,
      isRead: false
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        id: message._id,
        sender: { id: req.user._id, name: req.user.name },
        recipients: recipients.map(r => ({ id: r._id, name: r.name })),
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
      .populate('senderId', 'name')
      .populate('recipientIds', 'name')
      .populate('parentMessageId', 'content senderId')
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
    const notifications = await Notification.find({ userId: req.user._id })
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

exports.getAnalytics = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id })
      .populate('studentProgress.studentId', 'name')
      .populate('studentProgress.quizResults.quizId');

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const quizStats = await QuizResult.aggregate([
      { $match: { userId: { $in: teacher.studentProgress.map(sp => sp.studentId) } } },
      {
        $group: {
          _id: '$quizId',
          averageScore: { $avg: '$score' },
          totalAttempts: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' }
    ]);

    const engagementMetrics = teacher.studentProgress.map(sp => ({
      studentId: sp.studentId,
      quizCompletionRate: sp.quizResults.length > 0 
        ? (sp.quizResults.filter(qr => qr.score >= 60).length / sp.quizResults.length) * 100 
        : 0,
      resourceCompletionRate: sp.resourceEngagement.length > 0 
        ? (sp.resourceEngagement.filter(re => re.completed).length / sp.resourceEngagement.length) * 100 
        : 0
    }));

    res.status(200).json({
      quizStats,
      engagementMetrics,
      studentCount: teacher.studentProgress.length
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: err.message });
  }
};