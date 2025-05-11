const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  profilePicture: { type: String },
  socialId: { type: String },
  language: { type: String, default: 'en' },
  gmailAccessToken: { type: String },
  gmailRefreshToken: { type: String },
  refreshToken: { type: String },
  refreshTokenExpires: { type: Date },
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
    locationSharing: { type: Boolean, default: true },
    lastLocationUpdate: { type: Date }
  },
  // Common profile fields
  bio: { type: String },
  phoneNumber: { type: String },
  dateOfBirth: { type: Date },
  address: { type: String },
  // Groups field to support population
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  // Student-specific profile fields
  studentProfile: {
    grade: { type: String },
    interests: [{ type: String }],
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath' }],
    skills: [{ type: String }],
    educationLevel: { type: String },
    goals: [{ type: String }]
  },
  // Teacher-specific profile fields
  teacherProfile: {
    qualifications: [{ type: String }],
    expertise: [{ type: String }],
    yearsOfExperience: { type: Number },
    teachingCourses: [{
      name: { type: String },
      description: { type: String },
      level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
    }],
    certifications: [{ type: String }],
    availability: { type: String }
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Ensure both _id and id are available
      ret.id = ret._id;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateRefreshToken = async function () {
  const refreshToken = jwt.sign(
    { id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
  this.refreshToken = refreshToken;
  this.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return refreshToken;
};

userSchema.methods.clearRefreshToken = async function () {
  this.refreshToken = null;
  this.refreshTokenExpires = null;
};

// Create index for geospatial queries
userSchema.index({ "location.coordinates": "2dsphere" });

// Ensure model is registered only once
module.exports = mongoose.models.User || mongoose.model('User', userSchema);