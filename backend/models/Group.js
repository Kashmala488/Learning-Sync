const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  subject: { type: String, required: true }, // Subject area for the group (e.g., 'Mathematics', 'Web Development')
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Teacher who mentors this group
  maxMembers: { type: Number, default: 20 },
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    fileUrl: String,
    fileName: String,
    fileType: String,
    fileSize: Number,
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
