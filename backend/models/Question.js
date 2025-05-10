const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  subject: { type: String, required: true }, // e.g., "Mathematics", "Web Development"
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true },
  hint: { type: String }, // Optional hint for students
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  flaggedBy: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema); 