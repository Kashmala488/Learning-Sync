const Goal = require('../models/Goal');
const User = require('../models/User');
exports.getDashboard = async (req, res) => {
    try {
      const userId = req.params.id; // Assume you're passing the userId as a parameter
  
      // Fetch user data from the database based on userId
      const user = await User.findById(userId);
       console.log("user:",user);
      // Check if the user exists
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Respond with the user data (you can adjust what data you want to return)
      res.status(200).json({
      
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.findOne({ userId: req.params.userId });
    res.status(200).json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateGoals = async (req, res) => {
  try {
    const goals = await Goal.findOneAndUpdate(
      { userId: req.params.userId },
      { goals: req.body.goals },
      { new: true, upsert: true }
    );
    res.status(200).json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUpcomingSessions = async (req, res) => {
  try {
    // In a real application, you'd query your database for the upcoming sessions
    // For now, we'll return sample data
    const upcomingSessions = [
      { 
        id: 1, 
        title: 'JavaScript Basics Review', 
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        students: 18,
        location: 'Room 201'
      },
      { 
        id: 2, 
        title: 'React Component Workshop', 
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        students: 12,
        location: 'Virtual Meeting'
      },
      { 
        id: 3, 
        title: 'Code Review Session', 
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        students: 8,
        location: 'Lab 102'
      }
    ];
    
    res.status(200).json(upcomingSessions);
  } catch (err) {
    console.error('Error fetching upcoming sessions:', err);
    res.status(500).json({ error: err.message });
  }
};
