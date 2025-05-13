const axios = require('axios');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Question = require('../models/Question');
const QuizSession = require('../models/QuizSession');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Helper function to safely parse JSON from AI responses
const parseJsonFromAIResponse = (text) => {
  try {
    return JSON.parse(text);
  } catch (initialError) {
    console.log('Initial JSON parse failed, trying to extract JSON from text');
    const jsonArrayMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonArrayMatch) {
      try {
        return JSON.parse(jsonArrayMatch[0]);
      } catch (error) {
        console.error('Failed to parse extracted JSON array:', error);
        throw new Error('Could not parse JSON array from response');
      }
    }
    const jsonObjectMatch = text.match(/\{\s*".*"\s*:.*\}/s);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch (error) {
        console.error('Failed to parse extracted JSON object:', error);
        throw new Error('Could not parse JSON object from response');
      }
    }
    console.error('No valid JSON found in response:', text);
    throw new Error('No valid JSON found in AI response');
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).select('-questions.answer');
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const session = await QuizSession.findOne({
      quizId: req.params.quizId,
      userId: req.user._id
    }).sort({ createdAt: -1 });

    let groupData = null;
    if (session && session.groupId) {
      // Fetch group from Group Service
      const response = await axios.get(`http://localhost:3000/groups/${session.groupId}`, {
        headers: { Authorization: req.header('Authorization') }
      });
      const group = response.data.group;
      if (group) {
        groupData = {
          _id: group._id,
          name: group.name,
          subject: group.subject
        };
      }
    }

    const quizData = {
      ...quiz.toObject(),
      group: groupData
    };

    res.status(200).json(quizData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const recentSubmissions = await QuizResult.countDocuments({
      userId,
      quizId,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    });

    if (recentSubmissions >= 3) {
      await new SecurityLog({
        type: 'Suspicious Activity',
        userEmail: req.user.email,
        details: 'Unusual number of quiz submissions in short period',
        ipAddress: req.ip,
        timestamp: new Date()
      }).save();
      return res.status(429).json({
        error: 'Too many submissions in a short period. Please try again later.'
      });
    }

    let score = 0;
    const resultAnswers = answers.map(({ questionIndex, selectedAnswer }) => {
      const isCorrect = quiz.questions[questionIndex].answer === selectedAnswer;
      if (isCorrect) score += 1;
      return { questionIndex, selectedAnswer, isCorrect };
    });

    const percentageScore = (score / quiz.questions.length) * 100;

    const quizResult = await QuizResult.create({
      userId,
      quizId,
      score: percentageScore,
      answers: resultAnswers,
    });

    const session = await QuizSession.findOneAndUpdate(
      { userId, quizId, isActive: true },
      { isActive: false },
      { new: true }
    );

    const LearningPath = require('../models/LearningPath');
    const learningPaths = await LearningPath.find({
      studentId: userId,
      'quizzes.quizId': quizId
    });

    console.log(`Found ${learningPaths.length} learning paths containing quiz ${quizId}`);

    for (const path of learningPaths) {
      const quizIndex = path.quizzes.findIndex(
        q => q.quizId.toString() === quizId.toString()
      );

      if (quizIndex !== -1) {
        path.quizzes[quizIndex].completed = true;
        path.quizzes[quizIndex].score = percentageScore;

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
        console.log(`Updated learning path ${path._id}: progress now ${path.progress}%`);
      }
    }

    res.status(200).json({
      message: 'Quiz submitted',
      score: percentageScore,
      resultId: quizResult._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    const result = await QuizResult.findOne({ quizId, userId }).sort({ completedAt: -1 });

    if (!quiz || !result) {
      return res.status(404).json({ error: 'Quiz or result not found' });
    }

    const feedbackItems = result.answers.map(({ questionIndex, selectedAnswer, isCorrect }) => {
      const question = quiz.questions[questionIndex];
      return {
        question: question.question,
        selectedAnswer,
        correctAnswer: isCorrect ? null : question.answer,
        isCorrect,
        explanation: isCorrect
          ? "Correct answer!"
          : `The correct answer is "${question.answer}".`,
      };
    });

    let feedbackMessage = "";
    if (result.score >= 80) {
      feedbackMessage = "Excellent work! You have a strong grasp of the concepts.";
    } else if (result.score >= 60) {
      feedbackMessage = "Good job! You understand most of the material, but there's room for improvement.";
    } else {
      feedbackMessage = "You might need more practice with these concepts. Consider reviewing the material again.";
    }

    res.status(200).json({
      score: result.score,
      message: feedbackMessage,
      feedback: feedbackItems,
      totalQuestions: quiz.questions.length,
      correctAnswers: result.answers.filter(a => a.isCorrect).length,
      completedAt: result.createdAt
    });
  } catch (err) {
    console.error('Error getting feedback:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.flagQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questionIndex, reason } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz || questionIndex >= quiz.questions.length) {
      return res.status(404).json({ error: 'Quiz or question not found' });
    }

    quiz.flaggedQuestions.push({ questionIndex, userId: req.user._id, reason });
    await quiz.save();

    res.status(200).json({ message: 'Question flagged for review' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createQuiz = async (req, res) => {
  try {
    const { title, subject, difficulty, questions } = req.body;
    const createdBy = req.user._id;

    const quiz = await Quiz.create({
      title,
      subject,
      difficulty,
      createdBy,
      questions,
    });

    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateQuiz = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required for generating a quiz' });
    }

    // Fetch group from Group Service
    const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
      headers: { Authorization: req.header('Authorization') }
    });
    const group = response.data.group;
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(memberId =>
      memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        error: 'You are not a member of this group',
        userId: userId,
        groupMembers: group.members.map(m => m.toString())
      });
    }

    const groupSubject = group.subject;

    const results = await QuizResult.find({ userId }).populate({
      path: 'quizId',
      match: { subject: groupSubject }
    });

    const filteredResults = results.filter(result => result.quizId);

    const weakAreas = new Map();
    filteredResults.forEach(result => {
      result.answers.forEach(({ questionIndex, isCorrect }) => {
        if (!isCorrect && result.quizId.questions[questionIndex]) {
          const question = result.quizId.questions[questionIndex].question;
          const topic = question.split(' ').slice(0, 3).join(' ');
          weakAreas.set(topic, (weakAreas.get(topic) || 0) + 1);
        }
      });
    });

    const sortedWeakAreas = Array.from(weakAreas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    const focusAreasStr = sortedWeakAreas.length > 0
      ? `Focus especially on these areas where the student has struggled: ${sortedWeakAreas.join(', ')}.`
      : '';

    const existingQuizzes = await Quiz.find({ subject: groupSubject });
    if (existingQuizzes.length > 0) {
      console.log(`Found ${existingQuizzes.length} existing quizzes for subject: ${groupSubject}`);
    }

    const prompt = `Generate a quiz with 5 multiple-choice questions on ${groupSubject}. ${focusAreasStr}
          Format the response as a valid JSON array with this structure:
          [
            {
              "question": "question text",
              "options": ["option1", "option2", "option3", "option4"],
              "answer": "correct option",
              "hint": "hint text"
            }
    ]
    Make sure the response is properly formatted as a valid JSON array without any additional text.`;

    const responseAI = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      }
    );

    const data = responseAI.data;
    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
      throw new Error('Unexpected API response structure');
    }

    const contentText = data.candidates[0].content.parts[0].text;
    console.log("Received response from Gemini API");

    let questions;
    try {
      questions = parseJsonFromAIResponse(contentText);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format');
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Content:', contentText);
      throw new Error('Failed to parse API response as JSON');
    }

    const quiz = await Quiz.create({
      title: `${groupSubject} Adaptive Quiz`,
      subject: groupSubject,
      difficulty: 'medium',
      createdBy: userId,
      questions,
    });

    const session = await QuizSession.create({
      userId,
      quizId: quiz._id,
      groupId: groupId,
      startTime: new Date(),
      isActive: true
    });

    const quizData = {
      _id: quiz._id,
      title: quiz.title,
      subject: quiz.subject,
      difficulty: quiz.difficulty,
      groupId: groupId,
      sessionId: session._id,
      numberOfQuestions: quiz.questions.length,
      metadata: {
        groupName: group.name,
        focusAreas: sortedWeakAreas.length > 0 ? sortedWeakAreas : ['General review']
      }
    };

    res.status(200).json(quizData);
  } catch (err) {
    console.error('Quiz generation error:', {
      message: err.message,
      stack: err.stack,
      details: err
    });
    res.status(500).json({
      error: 'Failed to generate quiz',
      details: err.message
    });
  }
};

exports.requestHint = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questionIndex } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz || questionIndex >= quiz.questions.length) {
      return res.status(404).json({ error: 'Quiz or question not found' });
    }

    const hint = quiz.questions[questionIndex].hint || 'No hint available';
    res.status(200).json({ hint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProgressIndicator = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const session = await QuizSession.findOne({ userId, quizId, isActive: true });
    if (!session) return res.status(404).json({ error: 'No active quiz session found' });

    const totalQuestions = quiz.questions.length;
    const answeredQuestions = session.answeredQuestions.length;
    const progressPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    res.status(200).json({
      totalQuestions,
      answeredQuestions,
      progressPercentage: Math.round(progressPercentage)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.configureTimeSettings = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { totalTime, perQuestionTime } = req.body;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    if (totalTime !== undefined && (!Number.isInteger(totalTime) || totalTime <= 0)) {
      return res.status(400).json({ error: 'Total time must be a positive integer' });
    }
    if (perQuestionTime !== undefined && (!Number.isInteger(perQuestionTime) || perQuestionTime <= 0)) {
      return res.status(400).json({ error: 'Per-question time must be a positive integer' });
    }

    let session = await QuizSession.findOne({ userId, quizId, isActive: true });
    if (!session) {
      session = await QuizSession.create({
        userId,
        quizId,
        answeredQuestions: [],
        timeSettings: { totalTime, perQuestionTime },
        startTime: new Date()
      });
    } else {
      if (totalTime !== undefined) session.timeSettings.totalTime = totalTime;
      if (perQuestionTime !== undefined) session.timeSettings.perQuestionTime = perQuestionTime;
      await session.save();
    }

    res.status(200).json({
      message: 'Time settings configured successfully',
      timeSettings: session.timeSettings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGroupQuizzes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    // Fetch group from Group Service
    const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
      headers: { Authorization: req.header('Authorization') }
    });
    const group = response.data.group;
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(memberId =>
      memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        error: 'You are not a member of this group',
        userId: userId.toString(),
        groupMembers: group.members.map(m => m.toString())
      });
    }

    const quizzes = await Quiz.find({ subject: group.subject })
      .select('-questions.answer')
      .sort({ createdAt: -1 });

    const quizResults = await QuizResult.find({
      userId: userId,
      quizId: { $in: quizzes.map(q => q._id) }
    });

    const quizResultMap = quizResults.reduce((map, result) => {
      map[result.quizId.toString()] = result;
      return map;
    }, {});

    const quizData = quizzes.map(quiz => {
      const result = quizResultMap[quiz._id.toString()];
      return {
        _id: quiz._id,
        title: quiz.title,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        createdAt: quiz.createdAt,
        numberOfQuestions: quiz.questions.length,
        completed: !!result,
        score: result ? result.score : null,
        completedAt: result ? result.completedAt : null
      };
    });

    res.status(200).json(quizData);
  } catch (err) {
    console.error('Error fetching group quizzes:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPracticeQuestions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const { limit = 5 } = req.query;

    // Fetch group from Group Service
    const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
      headers: { Authorization: req.header('Authorization') }
    });
    const group = response.data.group;
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(memberId =>
      memberId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        error: 'You are not a member of this group',
        userId: userId.toString(),
        groupMembers: group.members.map(m => m.toString())
      });
    }

    const groupSubject = group.subject;

    const results = await QuizResult.find({ userId }).populate({
      path: 'quizId',
      match: { subject: groupSubject }
    });

    const filteredResults = results.filter(result => result.quizId);

    const weakAreas = new Map();
    filteredResults.forEach(result => {
      result.answers.forEach(({ questionIndex, isCorrect }) => {
        if (!isCorrect && result.quizId.questions[questionIndex]) {
          const question = result.quizId.questions[questionIndex].question;
          const topic = question.split(' ').slice(0, 3).join(' ');
          weakAreas.set(topic, (weakAreas.get(topic) || 0) + 1);
        }
      });
    });

    const sortedWeakAreas = Array.from(weakAreas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    const focusAreasStr = sortedWeakAreas.length > 0
      ? `Focus especially on these areas where the student has struggled: ${sortedWeakAreas.join(', ')}.`
      : '';

    let questions = await Question.find({ subject: groupSubject })
      .limit(parseInt(limit))
      .select('-answer');

    if (questions.length < parseInt(limit)) {
      console.log("Using Gemini API to generate practice questions");

      const prompt = `Generate ${parseInt(limit) - questions.length} multiple-choice practice questions on ${groupSubject}. ${focusAreasStr}
            Format the response as a valid JSON array with this structure:
            [
              {
                "question": "question text",
                "options": ["option1", "option2", "option3", "option4"],
                "answer": "correct option",
                "hint": "hint text",
                "subject": "${groupSubject}",
                "difficulty": "medium"
              }
      ]
      Make sure the response is properly formatted as a valid JSON array without any additional text.`;

      const responseAI = await axios.post(
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
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

      const data = responseAI.data;
      if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
        throw new Error('Unexpected API response structure');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      console.log("Received response from Gemini API for practice questions");

      let generatedQuestions;
      try {
        generatedQuestions = parseJsonFromAIResponse(responseText);
        if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
          throw new Error('Invalid questions format - not an array or empty array');
        }
        console.log(`Successfully parsed ${generatedQuestions.length} practice questions`);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Content preview:',
          responseText.substring(0, 200) + '...');
        throw new Error('Failed to parse AI response as JSON: ' + parseError.message);
      }

      for (const q of generatedQuestions) {
        await Question.create({
          subject: q.subject,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options,
          answer: q.answer,
          hint: q.hint,
          createdBy: userId
        });
      }

      questions = await Question.find({ subject: groupSubject })
        .limit(parseInt(limit))
        .select('-answer');
    }

    const responseData = {
      questions: questions,
      metadata: {
        groupName: group.name,
        subject: groupSubject,
        focusAreas: sortedWeakAreas.length > 0 ? sortedWeakAreas : ['General review']
      }
    };

    res.status(200).json(responseData);
  } catch (err) {
    console.error('Error fetching practice questions:', err);
    res.status(500).json({
      error: 'Failed to generate practice questions',
      details: err.message
    });
  }
};

exports.createStudentQuiz = async (req, res) => {
  try {
    const { title, subject, difficulty, questions, groupId } = req.body;
    const createdBy = req.user._id;

    if (!title || !subject || !questions || !groupId) {
      return res.status(400).json({ error: 'Missing required fields: title, subject, questions, and groupId are required' });
    }

    // Fetch group from Group Service
    const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
      headers: { Authorization: req.header('Authorization') }
    });
    const group = response.data.group;
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(memberId =>
      memberId.toString() === createdBy.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        error: 'You are not a member of this group',
        userId: createdBy.toString(),
        groupMembers: group.members.map(m => m.toString())
      });
    }

    if (subject !== group.subject) {
      return res.status(400).json({
        error: 'Quiz subject must match the group subject',
        groupSubject: group.subject
      });
    }

    const quiz = await Quiz.create({
      title,
      subject,
      difficulty: difficulty || 'medium',
      createdBy,
      questions,
    });

    const session = await QuizSession.create({
      userId: createdBy,
      quizId: quiz._id,
      groupId: groupId,
      startTime: new Date(),
      isActive: false
    });

    const notifications = group.members
      .filter(memberId => memberId.toString() !== createdBy.toString())
      .map(memberId => ({
        userId: memberId,
        type: 'quiz',
        content: `New quiz available: ${title}`,
        relatedId: quiz._id,
        isRead: false
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        numberOfQuestions: quiz.questions.length,
        groupId: groupId,
        sessionId: session._id
      }
    });
  } catch (err) {
    console.error('Error creating student quiz:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.generateAIQuiz = async (req, res) => {
  try {
    console.log("generateAIQuiz called with params:", req.params);
    console.log("User ID:", req.user._id);
    console.log("User role:", req.user.role);

    const userId = req.user._id;
    const { groupId } = req.params;
    const { topic, difficulty, numberOfQuestions = 5 } = req.body;

    // Fetch group from Group Service
    const response = await axios.get(`http://localhost:3000/groups/${groupId}`, {
      headers: { Authorization: req.header('Authorization') }
    });
    const group = response.data.group;
    if (!group) {
      console.log(`Group not found: ${groupId}`);
      return res.status(404).json({ error: 'Group not found' });
    }

    console.log(`Group found: ${group.name}, members: ${group.members.length}`);

    const isMember = group.members.some(memberId =>
      memberId.toString() === userId.toString()
    );

    if (!isMember) {
      console.log(`User ${userId} is not a member of group ${groupId}`);
      return res.status(403).json({
        error: 'You are not a member of this group',
        userId: userId.toString(),
        groupMembers: group.members.map(m => m.toString())
      });
    }

    const groupSubject = group.subject;
    console.log(`Generating quiz for subject: ${groupSubject}`);

    const topicStr = topic ? `specifically about ${topic} within ${groupSubject}` : `on ${groupSubject}`;
    const difficultyLevel = difficulty || 'medium';

    const prompt = `Generate a ${difficultyLevel} difficulty quiz with ${numberOfQuestions} multiple-choice questions ${topicStr}.
          Format the response as a valid JSON array with this structure:
          [
            {
              "question": "question text",
              "options": ["option1", "option2", "option3", "option4"],
              "answer": "correct option",
              "hint": "hint text"
            }
    ]
    Make sure the response is properly formatted as a valid JSON array without any additional text before or after the JSON.`;

    console.log("Using Gemini API for quiz generation");
    const responseAI = await axios.post(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
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

    const data = responseAI.data;
    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
      throw new Error('Unexpected API response structure');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log("Received response from Gemini API");

    let questions;
    try {
      questions = parseJsonFromAIResponse(responseText);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format - not an array or empty array');
      }
      console.log(`Successfully parsed ${questions.length} questions`);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Content preview:',
        responseText.substring(0, 200) + '...');
      throw new Error('Failed to parse AI response as JSON: ' + parseError.message);
    }

    const quizTitle = topic
      ? `${topic} in ${groupSubject} Quiz`
      : `${groupSubject} ${difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)} Quiz`;

    const quiz = await Quiz.create({
      title: quizTitle,
      subject: groupSubject,
      difficulty: difficultyLevel,
      createdBy: userId,
      questions,
    });

    const session = await QuizSession.create({
      userId,
      quizId: quiz._id,
      groupId: groupId,
      startTime: new Date(),
      isActive: true
    });

    const quizData = {
      _id: quiz._id,
      title: quiz.title,
      subject: quiz.subject,
      difficulty: quiz.difficulty,
      groupId: groupId,
      sessionId: session._id,
      numberOfQuestions: quiz.questions.length,
      metadata: {
        groupName: group.name,
        topic: topic || 'General'
      }
    };

    res.status(200).json(quizData);
  } catch (err) {
    console.error('Quiz generation error:', {
      message: err.message,
      stack: err.stack,
      details: err
    });
    res.status(500).json({
      error: 'Failed to generate quiz',
      details: err.message
    });
  }
};

exports.getStudentQuizResults = async (req, res) => {
  try {
    const userId = req.user._id;

    const results = await QuizResult.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'quizId',
        select: 'title subject difficulty questions'
      });

    if (!results || results.length === 0) {
      return res.status(200).json([]);
    }

    const validResults = results.filter(result => result.quizId != null);

    const formattedResults = validResults.map(result => {
      return {
        resultId: result._id,
        quizId: result.quizId._id,
        title: result.quizId.title,
        subject: result.quizId.subject,
        difficulty: result.quizId.difficulty,
        score: result.score,
        completedAt: result.createdAt,
        numberOfQuestions: result.quizId.questions.length
      };
    });

    res.status(200).json(formattedResults);
  } catch (err) {
    console.error('Error fetching student quiz results:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.generateFromResource = async (req, res) => {
  try {
    console.log("generateFromResource called with body:", req.body);
    const userId = req.user._id;
    const { resourceId, difficulty = 'medium', numberOfQuestions = 5 } = req.body;

    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }

    const Resource = require('../models/Resource');
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.sharedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'You do not have access to this resource'
      });
    }

    console.log(`Generating quiz for resource: ${resource.title}`);

    const resourceSubject = resource.title.split(':')[0] || 'General';
    const content = resource.content;
    if (!content || content.length < 100) {
      return res.status(400).json({
        error: 'Resource content is too short to generate a meaningful quiz'
      });
    }

    const prompt = `Generate a ${difficulty} difficulty quiz with ${numberOfQuestions} multiple-choice questions based on this content:

    ${content.substring(0, 3000)} ${content.length > 3000 ? '...' : ''}

    Format the response as a valid JSON array with this structure:
    [
      {
        "question": "question text",
        "options": ["option1", "option2", "option3", "option4"],
        "answer": "correct option",
        "hint": "hint text"
      }
    ]
    Make sure the response is properly formatted as a valid JSON array without any additional text before or after the JSON.`;

    console.log("Using Gemini API for resource-based quiz generation");
    const responseAI = await axios.post(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
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

    const data = responseAI.data;
    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
      throw new Error('Unexpected API response structure');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log("Received response from Gemini API");

    let questions;
    try {
      questions = parseJsonFromAIResponse(responseText);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format - not an array or empty array');
      }
      console.log(`Successfully parsed ${questions.length} questions`);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Content preview:',
        responseText.substring(0, 200) + '...');
      throw new Error('Failed to parse AI response as JSON: ' + parseError.message);
    }

    const quizTitle = `Quiz on: ${resource.title}`;

    const quiz = await Quiz.create({
      title: quizTitle,
      subject: resourceSubject,
      difficulty: difficulty,
      createdBy: userId,
      questions,
      resourceId: resourceId
    });

    const session = await QuizSession.create({
      userId,
      quizId: quiz._id,
      startTime: new Date(),
      isActive: true,
      resourceId: resourceId
    });

    const LearningPath = require('../models/LearningPath');
    const learningPaths = await LearningPath.find({
      studentId: userId,
      'resources.resourceId': resourceId
    });

    for (const path of learningPaths) {
      const quizExists = path.quizzes.some(q =>
        q.quizId && q.quizId.toString() === quiz._id.toString()
      );

      if (!quizExists) {
        path.quizzes.push({
          quizId: quiz._id,
          completed: false
        });

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
        console.log(`Added quiz to learning path: ${path.title}`);
      }
    }

    const quizData = {
      _id: quiz._id,
      title: quiz.title,
      subject: quiz.subject,
      difficulty: quiz.difficulty,
      sessionId: session._id,
      numberOfQuestions: quiz.questions.length,
      metadata: {
        resourceId: resourceId,
        resourceTitle: resource.title
      }
    };

    res.status(200).json(quizData);
  } catch (err) {
    console.error('Resource-based quiz generation error:', {
      message: err.message,
      stack: err.stack,
      details: err
    });
    res.status(500).json({
      error: 'Failed to generate quiz from resource',
      details: err.message
    });
  }
};