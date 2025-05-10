const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  quizDifficulty: {
    easy: { type: Number, default: 0.3 }, // Percentage of easy questions
    medium: { type: Number, default: 0.5 },
    hard: { type: Number, default: 0.2 },
  },
  maxQuizQuestions: { type: Number, default: 10 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);