const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  userEmail: { type: String, required: true },
  details: { type: String, required: true },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
  viewed: { type: Boolean, default: false },
  viewedAt: { type: Date },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  resolvedAt: { type: Date }
});

module.exports = mongoose.model('SecurityLog', securityLogSchema);