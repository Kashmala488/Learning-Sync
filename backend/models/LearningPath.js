const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  resources: [{
    resourceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Resource' 
    },
    completed: { 
      type: Boolean, 
      default: false 
    },
    order: { 
      type: Number 
    }
  }],
  quizzes: [{
    quizId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Quiz' 
    },
    completed: { 
      type: Boolean, 
      default: false 
    },
    score: { 
      type: Number 
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  deadline: {
    type: Date
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, { timestamps: true });

module.exports = mongoose.model('LearningPath', learningPathSchema);