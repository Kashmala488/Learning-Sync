const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['message', 'resource', 'quiz', 'other', 'video_call'], required: true },
  content: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, required: true }, // e.g., Message ID or Group ID
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);