const mongoose = require('mongoose');

const videoEngagementSchema = new mongoose.Schema({
  videoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Video', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  progress: { 
    type: Number, 
    default: 0, 
    min: 0,
    max: 100
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
  lastPosition: { 
    type: Number, 
    default: 0 
  },
  viewHistory: [{
    timestamp: { type: Date, default: Date.now },
    position: Number
  }],
  comments: [{
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true
    }
  }]
}, { timestamps: true });

// Create compound index for efficient queries
videoEngagementSchema.index({ videoId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('VideoEngagement', videoEngagementSchema);