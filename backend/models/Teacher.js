const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentProgress: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    quizResults: [{ quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizResult' }, score: Number }],
    resourceEngagement: [{ resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }, completed: Boolean }],
    lastUpdated: { type: Date, default: Date.now }
  }],
  classes: [{ id: String, name: String }],
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);