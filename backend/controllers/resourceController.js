const axios = require('axios');
const Resource = require('../models/Resource');
const User = require('../models/User');
const QuizResult = require('../models/QuizResult');
const Notification = require('../models/Notification');

exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find()
      .populate('sharedBy', 'name')
      .select('+ratings');
    res.status(200).json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserResources = async (req, res) => {
  try {
    const userId = req.user._id;

    const resources = await Resource.find({ sharedBy: userId })
      .populate('sharedBy', 'name')
      .select('+ratings');

    res.status(200).json(resources);
  } catch (err) {
    console.error('Error fetching user resources:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const resource = await Resource.findById(resourceId)
      .populate('sharedBy', 'name')
      .select('+ratings');

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.status(200).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.shareResource = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newResource = await Resource.create({
      title,
      content,
      sharedBy: req.user._id
    });

    const LearningPath = require('../models/LearningPath');
    const userId = req.user._id;

    const subject = title.split(':')[0].trim() || 'General';

    const existingPath = await LearningPath.findOne({
      studentId: userId,
      title: `Learning Path: ${subject}`
    });

    if (existingPath) {
      existingPath.resources.push({
        resourceId: newResource._id,
        completed: false,
        order: existingPath.resources.length + 1
      });

      const totalItems = existingPath.resources.length + existingPath.quizzes.length;
      const completedResources = existingPath.resources.filter(r => r.completed).length;
      const completedQuizzes = existingPath.quizzes.filter(q => q.completed).length;

      existingPath.progress = totalItems > 0
        ? Math.round(((completedResources + completedQuizzes) / totalItems) * 100)
        : 0;

      await existingPath.save();
    } else {
      await LearningPath.create({
        title: `Learning Path: ${subject}`,
        description: `A personalized learning path about ${subject}`,
        teacherId: userId,
        studentId: userId,
        resources: [{
          resourceId: newResource._id,
          completed: false,
          order: 1
        }],
        quizzes: [],
        status: 'active',
        progress: 0
      });
    }

    const populatedResource = await Resource.findById(newResource._id)
      .populate('sharedBy', 'name');

    res.status(201).json(populatedResource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { title, content } = req.body;

    const resource = await Resource.findById(resourceId);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.sharedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this resource' });
    }

    if (title) resource.title = title;
    if (content) resource.content = content;

    await resource.save();

    const populatedResource = await Resource.findById(resourceId)
      .populate('sharedBy', 'name');

    res.status(200).json(populatedResource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await Resource.findById(resourceId);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.sharedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this resource' });
    }

    await Resource.deleteOne({ _id: resourceId });

    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rateResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { score } = req.body;
    const userId = req.user._id;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const existingRating = resource.ratings.find(
      (rating) => rating.user.toString() === userId.toString()
    );

    if (existingRating) {
      existingRating.score = score;
    } else {
      resource.ratings.push({ user: userId, score });
    }

    await resource.save();

    const populatedResource = await Resource.findById(resourceId)
      .populate('sharedBy', 'name')
      .select('+ratings');

    res.status(200).json(populatedResource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.shareResourceWithGroups = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { groupIds } = req.body;
    const userId = req.user._id;

    console.log('Sharing resource to groups:', { resourceId, groupIds, userId });

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ error: 'At least one group ID is required' });
    }

    const resource = await Resource.findById(resourceId).populate('sharedBy', 'name');

    if (!resource) {
      console.error('Resource not found:', resourceId);
      return res.status(404).json({ error: 'Resource not found' });
    }

    console.log('Found resource:', {
      id: resource._id.toString(),
      title: resource.title,
      sharedBy: resource.sharedBy ? resource.sharedBy.name : 'Unknown'
    });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const results = await Promise.all(
      groupIds.map(async (groupId) => {
        try {
          // Fetch group from Group Service
          const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
            headers: { Authorization: req.header('Authorization') }
          });
          const group = response.data.group;

          if (!group) {
            return { groupId, success: false, error: 'Group not found' };
          }

          if (!group.members.some(member => member.toString() === userId.toString())) {
            return { groupId, success: false, error: 'Not a member of this group' };
          }

          const message = {
            sender: userId,
            content: `Shared a learning resource: ${resource.title}`,
            resourceId: resource._id
          };

          console.log('Adding message to group with resourceId:', message.resourceId.toString());

          // Update group messages via Group Service
          await axios.post(`http://localhost:3000/groups/${groupId}/messages`, message, {
            headers: { Authorization: req.header('Authorization') }
          });

          const notifications = group.members
            .filter(member => member.toString() !== userId.toString())
            .map(member => ({
              userId: member,
              type: 'resource',
              content: `${user.name} shared a resource in ${group.name}: ${resource.title}`,
              relatedId: resource._id,
              isRead: false
            }));

          if (notifications.length > 0) {
            await Notification.insertMany(notifications);
          }

          return { groupId, success: true };
        } catch (err) {
          console.error(`Error sharing with group ${groupId}:`, err);
          return { groupId, success: false, error: err.message };
        }
      })
    );

    if (results.every(result => !result.success)) {
      return res.status(500).json({
        error: 'Failed to share resource with any groups',
        details: results
      });
    }

    res.status(200).json({
      message: 'Resource shared successfully',
      results
    });
  } catch (err) {
    console.error('Error sharing resource with groups:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.generateAIResource = async (req, res) => {
  try {
    const { subject, difficulty = 'medium', contentLength = 'medium' } = req.body;
    const userId = req.user._id;

    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const quizResults = await QuizResult.find({ userId }).populate('quizId', 'subject');

    let weakPoints = '';
    const subjectResults = quizResults.filter(result =>
      result.quizId && result.quizId.subject.toLowerCase() === subject.toLowerCase());

    if (subjectResults.length > 0) {
      const incorrectAnswers = subjectResults.flatMap(result =>
        result.answers.filter(a => !a.isCorrect));
      if (incorrectAnswers.length > 0) {
        weakPoints = ` Focus especially on commonly missed concepts in this area.`;
      }
    }

    let wordCount;
    switch(contentLength.toLowerCase()) {
      case 'short':
        wordCount = 300;
        break;
      case 'long':
        wordCount = 1000;
        break;
      case 'medium':
      default:
        wordCount = 600;
    }

    let generatedContent;
    let title = `Learning Resource: ${subject} (${difficulty})`;

    try {
      console.log('Generating resource using Gemini API...');

      const prompt = `Create an educational resource about ${subject} at ${difficulty} difficulty level.${weakPoints}
      The resource should be approximately ${wordCount} words and include:
      1. A clear introduction to the topic
      2. Main concepts explained in detail
      3. Examples to illustrate key points
      4. A summary or conclusion

      Format the content with Markdown for headings, lists, and emphasis.`;

      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: Math.max(1000, wordCount * 4),
            topP: 0.95,
            topK: 40
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY
          }
        }
      );

      const data = response.data;
      if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
        throw new Error('Unexpected API response structure');
      }

      console.log('Content generation response received');

      generatedContent = data.candidates[0].content.parts[0].text;
      console.log('Content generation successful');

      try {
        const titlePrompt = `Generate a concise, engaging title (10 words or less) for an educational resource about ${subject} at ${difficulty} difficulty level. Return only the title text without quotes or additional text.`;

        const titleResponse = await axios.post(
          "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
          {
            contents: [{ parts: [{ text: titlePrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 50,
              topP: 0.95,
              topK: 40
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            }
          }
        );

        const titleData = titleResponse.data;
        if (titleData.candidates && titleData.candidates[0].content && titleData.candidates[0].content.parts[0]) {
          title = titleData.candidates[0].content.parts[0].text.trim().replace(/^["']|["']$/g, '');
          console.log('Generated title:', title);
        }
      } catch (titleErr) {
        console.warn('Title generation failed, using default title', titleErr);
      }
    } catch (apiError) {
      console.error('API Error:', apiError.message);

      title = `Learning About ${subject}`;
      generatedContent = `# Learning Resource: ${subject}

## Introduction

This is a placeholder resource about ${subject} at ${difficulty} level. The AI-generated content is currently unavailable due to API limitations.

## Key Concepts

- ${subject} is an important topic in its field
- Learning about ${subject} can help you understand related concepts
- Practice and consistent study will help you master this subject

## Further Resources

Consider exploring these resources to learn more about ${subject}:

1. Online courses on platforms like Coursera, Udemy, or Khan Academy
2. Textbooks from your local library
3. YouTube tutorials on the subject
4. Practice exercises from educational websites

## Summary

While we couldn't generate a complete resource at this time, we encourage you to explore the suggested resources to deepen your understanding of ${subject}.

*This content was automatically generated as a fallback. Please try again later for a more comprehensive resource.*`;
    }

    const newResource = await Resource.create({
      title,
      content: generatedContent,
      sharedBy: userId
    });

    const LearningPath = require('../models/LearningPath');

    const existingPath = await LearningPath.findOne({
      studentId: userId,
      title: `Learning Path: ${subject}`
    });

    if (existingPath) {
      existingPath.resources.push({
        resourceId: newResource._id,
        completed: false,
        order: existingPath.resources.length + 1
      });

      const totalItems = existingPath.resources.length + existingPath.quizzes.length;
      const completedResources = existingPath.resources.filter(r => r.completed).length;
      const completedQuizzes = existingPath.quizzes.filter(q => q.completed).length;

      existingPath.progress = totalItems > 0
        ? Math.round(((completedResources + completedQuizzes) / totalItems) * 100)
        : 0;

      await existingPath.save();
    } else {
      await LearningPath.create({
        title: `Learning Path: ${subject}`,
        description: `A personalized learning path about ${subject}`,
        teacherId: userId,
        studentId: userId,
        resources: [{
          resourceId: newResource._id,
          completed: false,
          order: 1
        }],
        quizzes: [],
        status: 'active',
        progress: 0
      });
    }

    const populatedResource = await Resource.findById(newResource._id)
      .populate('sharedBy', 'name');

    res.status(201).json(populatedResource);
  } catch (err) {
    console.error('Resource generation error:', {
      message: err.message,
      stack: err.stack,
      details: err
    });

    res.status(500).json({
      error: 'Failed to generate resource. Please try again later.',
      details: err.message
    });
  }
};

exports.markResourceComplete = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { isCompleted } = req.body;
    const userId = req.user._id;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (isCompleted) {
      const alreadyCompleted = resource.completedBy.some(
        entry => entry.user.toString() === userId.toString()
      );

      if (!alreadyCompleted) {
        resource.completedBy.push({ user: userId, completedAt: new Date() });
      }
    } else {
      resource.completedBy = resource.completedBy.filter(
        entry => entry.user.toString() !== userId.toString()
      );
    }

    await resource.save();

    const LearningPath = require('../models/LearningPath');
    const learningPaths = await LearningPath.find({
      studentId: userId,
      'resources.resourceId': resourceId
    });

    for (const path of learningPaths) {
      const resourceIndex = path.resources.findIndex(
        r => r.resourceId.toString() === resourceId
      );

      if (resourceIndex !== -1) {
        path.resources[resourceIndex].completed = isCompleted;

        const totalItems = path.resources.length + path.quizzes.length;
        const completedResources = path.resources.filter(r => r.completed).length;
        const completedQuizzes = path.quizzes.filter(q => q.completed).length;

        path.progress = totalItems > 0
          ? Math.round(((completedResources + completedQuizzes) / totalItems) * 100)
          : 0;

        if (path.progress === 100) {
          path.status = 'completed';
        } else if (path.status === 'completed' && path.progress < 100) {
          path.status = 'active';
        }

        await path.save();
      }
    }

    const updatedResource = await Resource.findById(resourceId)
      .populate('sharedBy', 'name')
      .select('+ratings');

    res.status(200).json({
      resource: updatedResource,
      message: isCompleted ? 'Resource marked as complete' : 'Resource marked as incomplete',
      isCompleted
    });
  } catch (err) {
    console.error('Error updating resource completion status:', err);
    res.status(500).json({ error: err.message });
  }
};