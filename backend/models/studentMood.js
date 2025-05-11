const mongoose = require('mongoose');

const studentMoodSchema = new mongoose.Schema({
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  mood: { 
    type: String,
    enum: ['happy', 'neutral', 'frustrated', 'confused', 'tired'],
    default: 'neutral'
  },
  stress: { 
    type: Number, 
    min: 1, 
    max: 10, 
    default: 5 
  },
  energy: { 
    type: Number, 
    min: 1, 
    max: 10, 
    default: 5 
  },
  history: [{
    mood: String,
    stress: Number,
    energy: Number,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Export model only if it hasn't been compiled yet
module.exports = mongoose.models.StudentMood || mongoose.model('StudentMood', studentMoodSchema);