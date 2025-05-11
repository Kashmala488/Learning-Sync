const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const SecurityLog = require('../models/SecurityLog');

// Helper function to generate tokens
const generateTokens = async (user) => {
  const payload = {
    id: user._id,
    email: user.email, // Added email field
    role: user.role
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  return { token, refreshToken };
};

exports.login = async (req, res) => {
  try {
    const { email, password, location } = req.body;
    console.log(`[Login] Attempting login for email: ${email}`);

    if (mongoose.connection.readyState !== 1) {
      console.error('[Login] Database not connected');
      return res.status(500).json({ error: 'Database connection error' });
    }

    const user = await User.findOne({ email });
    console.log(`[Login] User found:`, user ? 'Yes' : 'No');

    // Check for recent failed login attempts
    const recentFailedAttempts = await SecurityLog.countDocuments({
      userEmail: email,
      type: 'Failed Login',
      timestamp: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
    });

    if (recentFailedAttempts >= 5) {
      await new SecurityLog({
        type: 'Account Lockout',
        userEmail: email,
        details: 'Account locked due to multiple failed login attempts',
        ipAddress: req.ip,
        timestamp: new Date()
      }).save();
      return res.status(403).json({ message: 'Account locked due to multiple failed attempts. Please try again later.' });
    }

    if (!user) {
      console.log(`[Login] No user found with email: ${email}`);
      await new SecurityLog({
        type: 'Failed Login',
        userEmail: email,
        details: 'Invalid email or user not found',
        ipAddress: req.ip,
        timestamp: new Date()
      }).save();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log(`[Login] Invalid password for user: ${email}`);
      await new SecurityLog({
        type: 'Failed Login',
        userEmail: email,
        details: 'Incorrect password',
        ipAddress: req.ip,
        timestamp: new Date()
      }).save();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`[Login] Successful login for: ${email}, Role: ${user.role}`);

    // Update location if provided during login
    if (location && location.coordinates && location.coordinates.length === 2) {
      user.location = {
        type: "Point",
        coordinates: location.coordinates,
        locationSharing: location.locationSharing !== undefined ? location.locationSharing : true,
        lastLocationUpdate: new Date()
      };
      await user.save();
    }

    const { token, refreshToken } = await generateTokens(user);

    user.refreshToken = refreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      location: user.location
    };

    console.log(`[Login] Returning user data:`, userData);

    res.status(200).json({
      message: 'Login successful',
      user: userData,
      token,
      refreshToken,
      expiresIn: 15 * 60 * 1000
    });
  } catch (err) {
    console.error('[Login] Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({
      error: 'Login failed',
      details: err.message
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email, password, role });

    const { token, refreshToken } = await generateTokens(user);

    user.refreshToken = refreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      location: user.location
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userData,
      token,
      refreshToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.socialLogin = async (req, res) => {
  try {
    const { credential, role, location } = req.body;
    
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub, name, email, picture } = payload;
    
    let user = await User.findOne({ 
      $or: [
        { socialId: sub },
        { email: email }
      ]
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        socialId: sub,
        role: role || 'student',
        profilePicture: picture,
        gmailRefreshToken: null
      });
    } else if (!user.socialId) {
      user.socialId = sub;
      user.profilePicture = picture;
      await user.save();
    }

    // Update location if provided during login
    if (location && location.coordinates && location.coordinates.length === 2) {
      user.location = {
        type: "Point",
        coordinates: location.coordinates,
        locationSharing: location.locationSharing !== undefined ? location.locationSharing : true,
        lastLocationUpdate: new Date()
      };
      await user.save();
    }

    const { token, refreshToken } = await generateTokens(user);

    user.refreshToken = refreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    res.status(200).json({
      message: 'Social login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        location: user.location
      },
      token,
      refreshToken,
      expiresIn: 15 * 60 * 1000
    });
  } catch (err) {
    console.error('Social login error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    console.log('[Refresh Token] Received request');
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      console.warn('[Refresh Token] No refresh token provided');
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    console.log('[Refresh Token] Verifying token');
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    console.log('[Refresh Token] Looking up user with ID:', decoded.id);
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
      refreshTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      console.warn('[Refresh Token] Invalid or expired refresh token for user ID:', decoded.id);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    console.log('[Refresh Token] Generating new tokens for user:', user.email);
    const { token, refreshToken: newRefreshToken } = await generateTokens(user);

    user.refreshToken = newRefreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    console.log('[Refresh Token] Tokens refreshed successfully for user:', user.email);
    res.status(200).json({
      token,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60 * 1000
    });
  } catch (err) {
    console.error('[Refresh Token] Error:', err.message);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      user.refreshTokenExpires = null;
      await user.save();
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.gmailAuth = async (req, res) => {
  try {
    const { code } = req.body;
    
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const gmailProfile = await gmail.users.getProfile({
      userId: 'me',
    });

    const email = gmailProfile.data.emailAddress;
    
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: email.split('@')[0],
        role: 'student',
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token
      });
    } else {
      user.gmailAccessToken = tokens.access_token;
      user.gmailRefreshToken = tokens.refresh_token;
      await user.save();
    }

    const { token, refreshToken } = await generateTokens(user);

    user.refreshToken = refreshToken;
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    res.status(200).json({
      message: 'Gmail authentication successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token,
      refreshToken,
      expiresIn: 15 * 60 * 1000
    });
  } catch (err) {
    console.error('Gmail authentication error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { coordinates, locationSharing } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates format. Expected [longitude, latitude]'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: "Point",
          coordinates,
          locationSharing: locationSharing !== undefined ? locationSharing : true,
          lastLocationUpdate: new Date()
        }
      },
      { new: true }
    ).select('location');

    return res.status(200).json({
      success: true,
      data: {
        location: updatedUser.location
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId)
      .select('-password -refreshToken -refreshTokenExpires')
      .populate('groups', 'name description');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, bio, phoneNumber, dateOfBirth, address, language } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (address !== undefined) updateData.address = address;
    if (language) updateData.language = language;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password -refreshToken -refreshTokenExpires');
    
    return res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { grade, interests, skills, educationLevel, goals } = req.body;
    
    const updateData = { 'studentProfile': {} };
    if (grade !== undefined) updateData.studentProfile.grade = grade;
    if (interests) updateData.studentProfile.interests = interests;
    if (skills) updateData.studentProfile.skills = skills;
    if (educationLevel !== undefined) updateData.studentProfile.educationLevel = educationLevel;
    if (goals) updateData.studentProfile.goals = goals;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password -refreshToken -refreshTokenExpires');
    
    return res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateTeacherProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { qualifications, expertise, yearsOfExperience, teachingCourses, certifications, availability } = req.body;
    
    const updateData = { 'teacherProfile': {} };
    if (qualifications) updateData.teacherProfile.qualifications = qualifications;
    if (expertise) updateData.teacherProfile.expertise = expertise;
    if (yearsOfExperience !== undefined) updateData.teacherProfile.yearsOfExperience = yearsOfExperience;
    if (teachingCourses) updateData.teacherProfile.teachingCourses = teachingCourses;
    if (certifications) updateData.teacherProfile.certifications = certifications;
    if (availability !== undefined) updateData.teacherProfile.availability = availability;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password -refreshToken -refreshTokenExpires');
    
    return res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture URL is required'
      });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture },
      { new: true }
    ).select('-password -refreshToken -refreshTokenExpires');
    
    return res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getProfileById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only for viewing teacher profiles'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error fetching user profile by ID:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
};

exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId)
      .populate('groups', 'name description members')
      .select('groups');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user.groups || []
    });
  } catch (err) {
    console.error('Error fetching user groups:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user groups'
    });
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const gmail = google.gmail({ version: 'v1', auth: client });