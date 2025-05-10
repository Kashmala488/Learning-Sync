const mongoose = require('mongoose');

const quizSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // Optional: Which group's subject this quiz is for
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }, // Optional: Which resource this quiz is based on
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  isActive: { type: Boolean, default: true },
  timeSettings: {
    totalTime: { type: Number }, // In seconds, optional
    perQuestionTime: { type: Number } // In seconds, optional
  },
  answeredQuestions: [{
    questionIndex: Number,
    selectedAnswer: String,
    answerTime: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('QuizSession', quizSessionSchema); 