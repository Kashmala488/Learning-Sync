const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, min: 1, max: 5, required: true }
  }],
  completedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Virtual field to calculate average rating
resourceSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, rating) => acc + rating.score, 0);
  return (sum / this.ratings.length).toFixed(1);
});

// Ensure virtuals are included in JSON output
resourceSchema.set('toJSON', { virtuals: true });

const Resource = mongoose.model('Resource', resourceSchema);
module.exports = Resource;


//update