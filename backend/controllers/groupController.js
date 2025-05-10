const Group = require('../models/Group');
const User = require('../models/User');
const QuizResult = require('../models/QuizResult');
const LearningPath = require('../models/LearningPath');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'group-messages');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images, documents, and common file types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'), false);
  }
};

// Configure multer upload
const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

exports.getAllGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    console.log(`[getAllGroups] Fetching groups for user: ${req.user.email}, role: ${userRole}, userId: ${userId}`);

    let query = {};
    if (userRole === 'student') {
      // For students, fetch only groups they are members of
      query.members = userId;
    } else if (userRole === 'teacher') {
      // For teachers, fetch groups they mentor or are members of
      query = { $or: [{ mentor: userId }, { members: userId }] };
    }
    // Admins can see all groups

    const groups = await Group.find(query)
      .populate('members', 'name email')
      .populate('mentor', 'name email');

    console.log(`[getAllGroups] Found ${groups.length} groups for userId: ${userId}`);
    groups.forEach(group => {
      console.log(`[getAllGroups] Group: ${group.name}, ID: ${group._id}, Members: ${group.members.map(m => m.email).join(', ')}`);
    });

    res.status(200).json(groups);
  } catch (err) {
    console.error('[getAllGroups] Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const memberIds = members || [];
    if (!memberIds.includes(req.user._id.toString())) {
      memberIds.push(req.user._id);
    }

    const newGroup = new Group({
      name,
      members: memberIds,
      messages: []
    });

    await newGroup.save();

    const populatedGroup = await Group.findById(newGroup._id)
      .populate('members', 'name email')
      .populate('mentor', 'name email');

    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error('[createGroup] Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
};
exports.getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId)
      .populate('members', 'name')
      .populate('messages.sender', 'name')
      .populate('mentor', 'name');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true }
    ).populate('members', 'name');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { new: true }
    );
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.status(200).json({ message: 'Left group successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const sender = req.user._id;
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const group = await Group.findById(groupId)
      .populate('members', 'name');
      
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member._id.toString() === sender.toString())) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }
    
    // Get sender name for notification
    const senderName = group.members.find(member => member._id.toString() === sender.toString()).name || 'Someone';
    
    // Add message to group
    const newMessage = { sender, content };
    group.messages.push(newMessage);
    await group.save();
    
    // Create notifications for all other group members
    const notifications = group.members
      .filter(member => member._id.toString() !== sender.toString()) // Exclude sender
      .map(member => ({
        userId: member._id,
        type: 'message', 
        content: `${senderName} sent a message in ${group.name}`,
        relatedId: group._id,
        isRead: false
      }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    // Populate sender details for the response
    const populatedGroup = await Group.findById(groupId)
      .populate('members', 'name')
      .populate('messages.sender', 'name')
      .populate('messages.resourceId', 'title content sharedBy');
    
    res.status(200).json(populatedGroup);
  } catch (err) {
    console.error('Error sending group message:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    // Check if groupId is valid
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID format' });
    }
    
    const group = await Group.findById(groupId)
      .populate('messages.sender', 'name')
      .populate('messages.resourceId', 'title content sharedBy');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member - convert ObjectIds to strings for comparison
    const isMember = group.members.some(member => 
      member.toString() === userId.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }
    
    // Add debug logging for resource messages
    const resourceMessages = group.messages.filter(m => m.resourceId);
    if (resourceMessages.length > 0) {
      console.log('Found resource messages:', 
        resourceMessages.map(m => ({
          resourceId: m.resourceId,
          resourceIdType: typeof m.resourceId,
          resourceIdObj: m.resourceId && typeof m.resourceId === 'object' ? 'Is object' : 'Not object'
        }))
      );
    }
    
    // Return messages with proper error handling
    res.status(200).json(group.messages || []);
  } catch (err) {
    console.error('Error fetching group messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages. Please try again.' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Only allow group deletion by admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete groups' });
    }
    
    const result = await Group.deleteOne({ _id: groupId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findRecommendedGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 1. Gather student data to build a profile
    const [user, quizResults, learningPaths] = await Promise.all([
      User.findById(userId),
      QuizResult.find({ userId }).populate('quizId', 'subject'),
      LearningPath.find({ studentId: userId })
    ]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 2. Build user profile based on quiz performance and learning paths
    const userProfile = {
      subjects: {},
      interests: new Set(),
      performanceLevel: 0
    };
    
    // Calculate subject strengths and weaknesses from quiz results
    quizResults.forEach(result => {
      if (result.quizId && result.quizId.subject) {
        const subject = result.quizId.subject;
        if (!userProfile.subjects[subject]) {
          userProfile.subjects[subject] = {
            totalScore: 0,
            count: 0
          };
        }
        userProfile.subjects[subject].totalScore += result.score;
        userProfile.subjects[subject].count++;
      }
    });
    
    // Calculate average scores for each subject
    Object.keys(userProfile.subjects).forEach(subject => {
      const subjectData = userProfile.subjects[subject];
      subjectData.averageScore = subjectData.totalScore / subjectData.count;
      
      // Add subject to interests if score is high (above 70%)
      if (subjectData.averageScore > 70) {
        userProfile.interests.add(subject);
      }
    });
    
    // Get overall performance level (1-10 scale)
    const allScores = quizResults.map(result => result.score);
    userProfile.performanceLevel = allScores.length > 0 
      ? Math.min(10, Math.max(1, Math.round(
        (allScores.reduce((a, b) => a + b, 0) / allScores.length) / 10
      )))
      : 5; // Default to medium if no quizzes taken
    
    // 3. Get all groups with their member details
    const allGroups = await Group.find()
      .populate({
        path: 'members',
        select: 'name _id'
      });
    
    // 4. Filter out groups user is already in
    const availableGroups = allGroups.filter(
      group => !group.members.some(member => member._id.toString() === userId.toString())
    );
    
    // 5. Get profiles for members of available groups
    const memberIds = new Set();
    availableGroups.forEach(group => {
      group.members.forEach(member => {
        memberIds.add(member._id.toString());
      });
    });
    
    const memberQuizResults = await QuizResult.find({
      userId: { $in: Array.from(memberIds) }
    }).populate('quizId', 'subject');
    
    // 6. Build profiles for group members
    const memberProfiles = {};
    memberQuizResults.forEach(result => {
      const memberId = result.userId.toString();
      
      if (!memberProfiles[memberId]) {
        memberProfiles[memberId] = {
          subjects: {},
          interests: new Set(),
          performanceLevel: 0,
          scores: []
        };
      }
      
      // Add subject data
      if (result.quizId && result.quizId.subject) {
        const subject = result.quizId.subject;
        if (!memberProfiles[memberId].subjects[subject]) {
          memberProfiles[memberId].subjects[subject] = {
            totalScore: 0,
            count: 0
          };
        }
        memberProfiles[memberId].subjects[subject].totalScore += result.score;
        memberProfiles[memberId].subjects[subject].count++;
        memberProfiles[memberId].scores.push(result.score);
      }
    });
    
    // Calculate average scores and interests for members
    Object.keys(memberProfiles).forEach(memberId => {
      const profile = memberProfiles[memberId];
      
      Object.keys(profile.subjects).forEach(subject => {
        const subjectData = profile.subjects[subject];
        subjectData.averageScore = subjectData.totalScore / subjectData.count;
        
        // Add subject to interests if score is high
        if (subjectData.averageScore > 70) {
          profile.interests.add(subject);
        }
      });
      
      // Set performance level
      profile.performanceLevel = profile.scores.length > 0
        ? Math.min(10, Math.max(1, Math.round(
          (profile.scores.reduce((a, b) => a + b, 0) / profile.scores.length) / 10
        )))
        : 5;
    });
    
    // 7. Calculate group scores based on different factors
    const groupScores = availableGroups.map(group => {
      let totalScore = 0;
      
      // FACTOR 1: Subject Complementarity (30% weight)
      // Score higher for groups with members strong in user's weak subjects
      let complementarityScore = 0;
      const userWeakSubjects = Object.keys(userProfile.subjects)
        .filter(subject => userProfile.subjects[subject].averageScore < 60);
      
      if (userWeakSubjects.length > 0) {
        let strengthMatches = 0;
        
        group.members.forEach(member => {
          const memberId = member._id.toString();
          const memberProfile = memberProfiles[memberId];
          
          if (memberProfile) {
            userWeakSubjects.forEach(subject => {
              if (memberProfile.subjects[subject] && 
                  memberProfile.subjects[subject].averageScore > 70) {
                strengthMatches++;
              }
            });
          }
        });
        
        complementarityScore = Math.min(10, strengthMatches);
      }
      
      // FACTOR 2: Interest Overlap (40% weight)
      // Score higher for shared interests
      let interestScore = 0;
      if (userProfile.interests.size > 0) {
        let totalOverlap = 0;
        
        group.members.forEach(member => {
          const memberId = member._id.toString();
          const memberProfile = memberProfiles[memberId];
          
          if (memberProfile && memberProfile.interests.size > 0) {
            // Count overlapping interests
            const userInterestsArray = Array.from(userProfile.interests);
            const overlap = userInterestsArray.filter(interest => 
              memberProfile.interests.has(interest)
            ).length;
            
            totalOverlap += overlap;
          }
        });
        
        interestScore = Math.min(10, totalOverlap);
      }
      
      // FACTOR 3: Performance Level Matching (20% weight)
      // Score higher when group performance level is slightly higher than user's
      let performanceScore = 0;
      let groupPerformanceTotal = 0;
      let membersWithScores = 0;
      
      group.members.forEach(member => {
        const memberId = member._id.toString();
        const memberProfile = memberProfiles[memberId];
        
        if (memberProfile && memberProfile.performanceLevel > 0) {
          groupPerformanceTotal += memberProfile.performanceLevel;
          membersWithScores++;
        }
      });
      
      const groupPerformanceAvg = membersWithScores > 0 
        ? groupPerformanceTotal / membersWithScores 
        : 5;
      
      // Optimal learning happens when group is slightly better than user
      const performanceDiff = groupPerformanceAvg - userProfile.performanceLevel;
      if (performanceDiff >= 0 && performanceDiff <= 2) {
        // Slightly better group is ideal
        performanceScore = 10 - Math.abs(1 - performanceDiff) * 5;
      } else if (performanceDiff > 2) {
        // Much better group is less ideal (might be intimidating)
        performanceScore = 5 - Math.min(5, performanceDiff - 2);
      } else {
        // Worse performing group is least ideal
        performanceScore = 5 + performanceDiff;
      }
      performanceScore = Math.max(0, performanceScore);
      
      // FACTOR 4: Group Size (10% weight)
      // Score higher for smaller groups (easier to integrate)
      const sizeScore = 10 - Math.min(9, group.members.length - 1);
      
      // Calculate final weighted score
      totalScore = (
        complementarityScore * 0.3 + 
        interestScore * 0.4 + 
        performanceScore * 0.2 + 
        sizeScore * 0.1
      );
      
      return {
        group,
        score: totalScore,
        factors: {
          complementarity: complementarityScore,
          interests: interestScore,
          performance: performanceScore,
          size: sizeScore
        }
      };
    });
    
    // 8. Sort groups by score and return top recommendations
    const recommendations = groupScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => ({
        ...item.group.toObject(),
        matchScore: Math.round(item.score * 10) // Convert to 0-100 scale
      }));
    
    res.status(200).json(recommendations);
  } catch (err) {
    console.error('Error in group recommendations:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getGroupsWithoutMentor = async (req, res) => {
  try {
    const groups = await Group.find({ mentor: { $exists: false } })
      .populate('members', 'name')
      .populate('mentor', 'name');
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGroupsWithoutMentorForTeacher = async (req, res) => {
  try {
    // Get groups that the teacher isn't already mentoring
    const groups = await Group.find({ 
      $or: [
        { mentor: { $exists: false } },
        { mentor: null }
      ]
    })
      .populate('members', 'name')
      .populate('mentor', 'name');
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTeacherMentoredGroups = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const groups = await Group.find({ mentor: teacherId })
      .populate('members', 'name')
      .populate('mentor', 'name');
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.assignMentor = async (req, res) => {
  try {
    const { groupId } = req.params;
    const teacherId = req.user._id;
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can be mentors' });
    }
    
    const group = await Group.findByIdAndUpdate(
      groupId,
      { mentor: teacherId },
      { new: true }
    )
      .populate('members', 'name')
      .populate('mentor', 'name');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unassignMentor = async (req, res) => {
  try {
    const { groupId } = req.params;
    const teacherId = req.user._id;
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can manage mentorship' });
    }
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if the teacher is the current mentor
    if (group.mentor && group.mentor.toString() !== teacherId.toString()) {
      return res.status(403).json({ error: 'You are not the mentor of this group' });
    }
    
    group.mentor = null;
    await group.save();
    
    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'name')
      .populate('mentor', 'name');
    
    res.status(200).json(updatedGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessageWithFile = async (req, res) => {
  try {
    // Use multer to handle the file upload
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      const { groupId } = req.params;
      const { content } = req.body;
      const sender = req.user._id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const group = await Group.findById(groupId)
        .populate('members', 'name');
        
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      // Check if user is a member of the group
      if (!group.members.some(member => member._id.toString() === sender.toString())) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
      
      // Get sender name for notification
      const senderName = group.members.find(member => member._id.toString() === sender.toString()).name || 'Someone';
      
      // Create file URL (relative to server)
      // Use forward slashes for web paths regardless of OS
      const fileUrl = `/uploads/group-messages/${path.basename(file.path)}`;
      console.log('File uploaded to:', file.path);
      console.log('File URL set to:', fileUrl);
      
      // Add message with file
      group.messages.push({
        sender,
        content,
        fileUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size
      });
      
      await group.save();
      
      // Create notifications for all other group members
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'file';
      const notifications = group.members
        .filter(member => member._id.toString() !== sender.toString()) // Exclude sender
        .map(member => ({
          userId: member._id,
          type: 'message',
          content: `${senderName} shared a ${fileType} in ${group.name}`,
          relatedId: group._id,
          isRead: false
        }));
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
      
      // Populate sender details for the response
      const populatedGroup = await Group.findById(groupId)
        .populate('members', 'name')
        .populate('messages.sender', 'name')
        .populate('messages.resourceId', 'title content sharedBy');
      
      res.status(200).json(populatedGroup);
    });
  } catch (err) {
    console.error('Error in sendMessageWithFile:', err);
    res.status(500).json({ error: err.message });
  }
};