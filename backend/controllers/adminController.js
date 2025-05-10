const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Settings = require('../models/Settings');
const SecurityLog = require('../models/SecurityLog');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSecurityAlerts = async (req, res) => {
  try {
    // Fetch recent security alerts (e.g., last 7 days)
    const alerts = await SecurityLog.find({
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDetailedAnalytics = async (req, res) => {
  try {
    const userActivity = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const quizCompletion = await QuizResult.aggregate([
      {
        $group: {
          _id: '$quizId',
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$score' }
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
      { $unwind: '$quiz' },
      {
        $project: {
          title: '$quiz.title',
          totalAttempts: 1,
          averageScore: 1
        }
      },
      { $sort: { totalAttempts: -1 } },
      { $limit: 10 }
    ]);

    const subjectPerformance = await QuizResult.aggregate([
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$quiz' },
      {
        $group: {
          _id: '$quiz.subject',
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$score' }
        }
      },
      { $sort: { totalAttempts: -1 } }
    ]);

    res.status(200).json({
      userActivity,
      quizCompletion,
      subjectPerformance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getModerationQueue = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ flaggedQuestions: { $ne: [] } })
      .select('title flaggedQuestions')
      .populate('flaggedQuestions.userId', 'name');
    const moderationQueue = quizzes.map(quiz => ({
      quizId: quiz._id,
      title: quiz.title,
      flaggedQuestions: quiz.flaggedQuestions,
    }));
    res.status(200).json(moderationQueue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.moderateContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { questionIndex, action } = req.body;
    const quiz = await Quiz.findById(contentId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    if (action === 'reject') {
      quiz.flaggedQuestions = quiz.flaggedQuestions.filter(fq => fq.questionIndex !== questionIndex);
      quiz.questions.splice(questionIndex, 1);
    } else {
      quiz.flaggedQuestions = quiz.flaggedQuestions.filter(fq => fq.questionIndex !== questionIndex);
    }
    await quiz.save();
    res.status(200).json({ message: `Question ${action}ed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateReports = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const quizResults = await QuizResult.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);
    const reports = {
      totalUsers: userCount,
      averageQuizScore: quizResults[0]?.avgScore || 0,
      activeUsers: await User.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
    };
    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { quizDifficulty, maxQuizQuestions } = req.body;
    const settings = await Settings.findOneAndUpdate(
      {},
      { quizDifficulty, maxQuizQuestions, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAlertAsViewed = async (req, res) => {
  try {
    const { alertId } = req.params;
    
    const alert = await SecurityLog.findByIdAndUpdate(
      alertId,
      { 
        viewed: true, 
        viewedAt: new Date(),
        status: 'resolved'
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.status(200).json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({
        quizDifficulty: {
          easy: 0.3,
          medium: 0.5,
          hard: 0.2
        },
        maxQuizQuestions: 10,
        updatedBy: req.user._id
      });
    }

    res.status(200).json(settings);
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ error: err.message });
  }
};