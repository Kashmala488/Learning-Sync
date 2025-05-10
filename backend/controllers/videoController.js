const Video = require('../models/Video');
const VideoEngagement = require('../models/VideoEngagement');

exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().populate('uploadedBy', 'name');
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadVideo = async (req, res) => {
  try {
    const { title, url } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }
    
    const newVideo = await Video.create({ 
      title, 
      url, 
      uploadedBy: req.user._id 
    });
    
    res.status(201).json(newVideo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId).populate('uploadedBy', 'name');
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Get user's engagement data if available
    const engagement = await VideoEngagement.findOne({
      videoId,
      userId: req.user._id
    });
    
    res.status(200).json({
      video,
      engagement: engagement || { progress: 0, completed: false, comments: [] }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Validate video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Validate comment content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Find or create engagement record
    let engagement = await VideoEngagement.findOne({ videoId, userId });
    
    if (!engagement) {
      engagement = new VideoEngagement({
        videoId,
        userId,
        progress: 0,
        completed: false,
        lastPosition: 0,
        viewHistory: [],
        comments: []
      });
    }

    // Add new comment
    engagement.comments.push({
      content,
      createdAt: new Date()
    });

    await engagement.save();

    // Return the newly added comment with user info
    const newComment = engagement.comments[engagement.comments.length - 1];
    const populatedEngagement = await VideoEngagement.findOne({ videoId, userId })
      .populate('userId', 'name');
    
    res.status(201).json({
      _id: newComment._id,
      content: newComment.content,
      createdAt: newComment.createdAt,
      userId: {
        _id: userId,
        name: populatedEngagement.userId.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { videoId } = req.params;

    // Validate video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Get all engagements with comments for this video
    const engagements = await VideoEngagement.find({ 
      videoId,
      comments: { $ne: [] }
    }).populate('userId', 'name');

    // Flatten and format comments
    const comments = engagements
      .flatMap(eng => eng.comments.map(comment => ({
        _id: comment._id,
        content: comment.content,
        createdAt: comment.createdAt,
        userId: {
          _id: eng.userId._id,
          name: eng.userId.name
        }
      })))
      .sort((a, b) => b.createdAt - a.createdAt); // Newest first

    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { videoId, commentId } = req.params;
    const userId = req.user._id;

    // Validate video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Find engagement with the comment
    const engagement = await VideoEngagement.findOne({
      videoId,
      'comments._id': commentId
    });

    if (!engagement) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check authorization
    const comment = engagement.comments.id(commentId);
    if (engagement.userId.toString() !== userId.toString() &&
        video.uploadedBy.toString() !== userId.toString() &&
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Remove comment
    engagement.comments.pull({ _id: commentId });
    await engagement.save();

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.trackEngagement = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { progress, completed, lastPosition } = req.body;
    const userId = req.user._id;
    
    // Validate video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Update or create engagement record
    let engagement = await VideoEngagement.findOne({ videoId, userId });
    
    if (!engagement) {
      engagement = new VideoEngagement({
        videoId,
        userId,
        progress: progress || 0,
        completed: completed || false,
        lastPosition: lastPosition || 0,
        viewHistory: [{
          timestamp: new Date(),
          position: lastPosition || 0
        }],
        comments: []
      });
    } else {
      engagement.progress = progress !== undefined ? progress : engagement.progress;
      engagement.completed = completed !== undefined ? completed : engagement.completed;
      engagement.lastPosition = lastPosition !== undefined ? lastPosition : engagement.lastPosition;
      
      // Add to view history
      if (lastPosition !== undefined) {
        engagement.viewHistory.push({
          timestamp: new Date(),
          position: lastPosition
        });
        
        // Limit history to last 100 entries
        if (engagement.viewHistory.length > 100) {
          engagement.viewHistory = engagement.viewHistory.slice(-100);
        }
      }
    }
    
    await engagement.save();
    
    res.status(200).json(engagement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRecommendedVideos = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's video engagement
    const engagements = await VideoEngagement.find({ userId });
    
    // Get all videos
    const allVideos = await Video.find().populate('uploadedBy', 'name');
    
    // Filter out videos user has completed
    const completedVideoIds = engagements
      .filter(e => e.completed)
      .map(e => e.videoId.toString());
    
    const recommendations = allVideos
      .filter(video => !completedVideoIds.includes(video._id.toString()))
      .slice(0, 5); // Limit to 5 recommendations
    
    res.status(200).json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Only teachers or admins can delete videos
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Admins can delete any video, teachers can only delete their own
    if (req.user.role === 'teacher' && video.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }
    
    await Video.deleteOne({ _id: videoId });
    
    // Clean up engagement data (including comments)
    await VideoEngagement.deleteMany({ videoId });
    
    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};