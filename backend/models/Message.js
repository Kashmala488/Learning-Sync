const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  content: { type: String, required: true },
  parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // For replies
  isRead: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Tracks which recipients have read
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);