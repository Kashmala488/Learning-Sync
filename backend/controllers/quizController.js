const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Group = require('../models/Group');
const Question = require('../models/Question');
const QuizSession = require('../models/QuizSession');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const Notification = require('../models/Notification');
const fetch = require('node-fetch');
const mongoose = require('mongoose');

// Helper function to safely parse JSON from AI responses
// This is particularly important for Gemini which may return extra text
const parseJsonFromAIResponse = (text) => {
  try {
    // First try to directly parse the text as JSON
    return JSON.parse(text);
  } catch (initialError) {
    console.log('Initial JSON parse failed, trying to extract JSON from text');

    // Look for JSON array pattern
    const jsonArrayMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonArrayMatch) {
      try {
        return JSON.parse(jsonArrayMatch[0]);
      } catch (error) {
        console.error('Failed to parse extracted JSON array:', error);
        throw new Error('Could not parse JSON array from response');
      }
    }
    
    // Look for JSON object pattern as fallback
    const jsonObjectMatch = text.match(/\{\s*".*"\s*:.*\}/s);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch (error) {
        console.error('Failed to parse extracted JSON object:', error);
        throw new Error('Could not parse JSON object from response');
      }
    }
    
    // If we get here, we couldn't find valid JSON
    console.error('No valid JSON found in response:', text);
    throw new Error('No valid JSON found in AI response');
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).select('-questions.answer'); // Hide answers
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Check if this quiz is associated with a group session
    const session = await QuizSession.findOne({ 
      quizId: req.params.quizId,
      userId: req.user._id
    }).sort({ createdAt: -1 });

    // If the quiz has a session with a group, fetch the group info
    let groupData = null;
    if (session && session.groupId) {
      const group = await Group.findById(session.groupId);
      if (group) {
        groupData = {
          _id: group._id,
          name: group.name,
          subject: group.subject
        };
      }
    }

    // Return the quiz with the group data if available
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
    const { answers } = req.body; // Array of { questionIndex, selectedAnswer }
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Check for suspicious activity (e.g., multiple submissions in 1 minute)
    const recentSubmissions = await QuizResult.countDocuments({
      userId,
      quizId,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // Last 1 minute
    });

    if (recentSubmissions >= 3) {
      await new SecurityLog({
        type: 'Suspicious Activity',
        userEmail: req.user.email, // Assumes req.user is set by auth middleware
        details: 'Unusual number of quiz submissions in short period',
        ipAddress: req.ip,
        timestamp: new Date()
      }).save();
      return res.status(429).json({ 
        error: 'Too many submissions in a short period. Please try again later.' 
      });
    }

    // Evaluate answers
    let score = 0;
    const resultAnswers = answers.map(({ questionIndex, selectedAnswer }) => {
      const isCorrect = quiz.questions[questionIndex].answer === selectedAnswer;
      if (isCorrect) score += 1;
      return { questionIndex, selectedAnswer, isCorrect };
    });

    const percentageScore = (score / quiz.questions.length) * 100;

    // Save result
    const quizResult = await QuizResult.create({
      userId,
      quizId,
      score: percentageScore,
      answers: resultAnswers,
    });

    // End quiz session
    const session = await QuizSession.findOneAndUpdate(
      { userId, quizId, isActive: true },
      { isActive: false },
      { new: true }
    );

    // Update learning paths that include this quiz
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
        // Update quiz completion status and score
        path.quizzes[quizIndex].completed = true;
        path.quizzes[quizIndex].score = percentageScore;
        
        // Recalculate path progress
        const totalItems = path.resources.length + path.quizzes.length;
        const completedResources = path.resources.filter(r => r.completed).length;
        const completedQuizzes = path.quizzes.filter(q => q.completed).length;
        
        path.progress = totalItems > 0 
          ? Math.round(((completedResources + completedQuizzes) / totalItems) * 100) 
          : 0;
        
        // Update path status based on progress
        if (path.progress === 100) {
          path.status = 'completed';
        } else if (path.status === 'completed' && path.progress < 100) {
          // If it was previously completed but now isn't at 100%, set back to active
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

    // Create feedback for each question
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

    // Create a summary message based on score
    let feedbackMessage = "";
    if (result.score >= 80) {
      feedbackMessage = "Excellent work! You have a strong grasp of the concepts.";
    } else if (result.score >= 60) {
      feedbackMessage = "Good job! You understand most of the material, but there's room for improvement.";
    } else {
      feedbackMessage = "You might need more practice with these concepts. Consider reviewing the material again.";
    }

    // Send a comprehensive response
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
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz || questionIndex >= quiz.questions.length) {
      return res.status(404).json({ error: 'Quiz or question not found' });
    }

    quiz.flaggedQuestions.push({ questionIndex, userId, reason });
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
      questions, // Array of { question, options, answer, hint }
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

    // Get the selected group ID from the request body
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required for generating a quiz' });
    }

    // Find the user's group to get the subject
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is a member of the group
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

    // Analyze past performance on this subject for this user
    const results = await QuizResult.find({ userId }).populate({
      path: 'quizId',
      match: { subject: groupSubject }
    });

    // Filter out null quizId results (quizzes that don't match the subject)
    const filteredResults = results.filter(result => result.quizId);

    // Identify weak areas within this subject
    const weakAreas = new Map();

    filteredResults.forEach(result => {
      result.answers.forEach(({ questionIndex, isCorrect }) => {
        if (!isCorrect && result.quizId.questions[questionIndex]) {
          // Extract key topic from the question (for simplicity, using first few words)
          const question = result.quizId.questions[questionIndex].question;
          const topic = question.split(' ').slice(0, 3).join(' '); // Extract first 3 words as topic

          weakAreas.set(topic, (weakAreas.get(topic) || 0) + 1);
        }
      });
    });

    // Convert weak areas to array and sort by frequency
    const sortedWeakAreas = Array.from(weakAreas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Take top 3 weak areas
      .map(entry => entry[0]);

    // Generate a focus area string for the AI prompt (if we have weak areas)
    const focusAreasStr = sortedWeakAreas.length > 0 
      ? `Focus especially on these areas where the student has struggled: ${sortedWeakAreas.join(', ')}.` 
      : '';

    // Check if there are existing quizzes for this subject
    const existingQuizzes = await Quiz.find({ subject: groupSubject });

    // If we have at least one existing quiz for this subject, we'll generate a unique quiz
    // Otherwise, use the API to generate one
    if (existingQuizzes.length > 0) {
      console.log(`Found ${existingQuizzes.length} existing quizzes for subject: ${groupSubject}`);
    }

    // Use Gemini to generate a quiz with focus on weak areas
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
        temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error Response:', data);
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Invalid API Response Structure:', data);
      throw new Error('Unexpected API response structure');
    }

    const contentText = data.candidates[0].content.parts[0].text;
    console.log("Received response from Gemini API");

    let questions;
    try {
      // Find the JSON part of the response (in case there's additional text)
      const jsonMatch = contentText.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(contentText);
      }
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format');
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Content:', contentText);
      throw new Error('Failed to parse API response as JSON');
    }

    // Create the quiz linked to the group's subject
    const quiz = await Quiz.create({
      title: `${groupSubject} Adaptive Quiz`,
      subject: groupSubject,
      difficulty: 'medium',
      createdBy: userId,
      questions,
    });

    // Create a quiz session for tracking progress
    const session = await QuizSession.create({
      userId,
      quizId: quiz._id,
      groupId: groupId,
      startTime: new Date(),
      isActive: true
    });

    // Return minimal quiz details without answers
    const quizData = {
      _id: quiz._id,
      title: quiz.title,
      subject: quiz.subject,
      difficulty: quiz.difficulty,
      groupId: groupId,
      sessionId: session._id,
      numberOfQuestions: quiz.questions.length,
      // Include metadata for context
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
    const { totalTime, perQuestionTime } = req.body; // In seconds
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Validate input
    if (totalTime !== undefined && (!Number.isInteger(totalTime) || totalTime <= 0)) {
      return res.status(400).json({ error: 'Total time must be a positive integer' });
    }
    if (perQuestionTime !== undefined && (!Number.isInteger(perQuestionTime) || perQuestionTime <= 0)) {
      return res.status(400).json({ error: 'Per-question time must be a positive integer' });
    }

    // Find or create a quiz session
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
      // Update time settings
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

    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is a member of the group
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

    // Get quizzes related to the group's subject
    const quizzes = await Quiz.find({ subject: group.subject })
      .select('-questions.answer') // Exclude answers
      .sort({ createdAt: -1 }); // Sort by most recent first

    // Get quiz results for this user
    const quizResults = await QuizResult.find({
      userId: userId,
      quizId: { $in: quizzes.map(q => q._id) }
    });

    // Map results to quiz IDs for quick lookup
    const quizResultMap = quizResults.reduce((map, result) => {
      map[result.quizId.toString()] = result;
      return map;
    }, {});

    // Prepare response data
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
    const { limit = 5 } = req.query; // Default to 5 questions

    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is a member of the group
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

    // Analyze past performance to identify weak areas in this subject
    const results = await QuizResult.find({ userId }).populate({
      path: 'quizId',
      match: { subject: groupSubject }
    });

    // Filter out null quizId results
    const filteredResults = results.filter(result => result.quizId);

    // Identify weak areas within this subject
    const weakAreas = new Map();

    filteredResults.forEach(result => {
      result.answers.forEach(({ questionIndex, isCorrect }) => {
        if (!isCorrect && result.quizId.questions[questionIndex]) {
          // Extract key topic from the question
          const question = result.quizId.questions[questionIndex].question;
          const topic = question.split(' ').slice(0, 3).join(' '); // First 3 words as topic

          weakAreas.set(topic, (weakAreas.get(topic) || 0) + 1);
        }
      });
    });

    // Convert weak areas to array and sort by frequency
    const sortedWeakAreas = Array.from(weakAreas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Take top 3 weak areas
      .map(entry => entry[0]);

    // Generate a focus area string for the AI prompt
    const focusAreasStr = sortedWeakAreas.length > 0 
      ? `Focus especially on these areas where the student has struggled: ${sortedWeakAreas.join(', ')}.` 
      : '';

    // Check for existing questions in the database
    let questions = await Question.find({ subject: groupSubject })
      .limit(parseInt(limit))
      .select('-answer'); // Hide answers

    // If not enough questions, generate new ones using Gemini API
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

      const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
          temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.95,
            topK: 40
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
      }

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('Invalid API Response Structure:', data);
        throw new Error('Unexpected API response structure');
      }

      const responseText = data.candidates[0].content.parts[0].text;
      console.log("Received response from Gemini API for practice questions");

      let generatedQuestions;
      try {
        // Use the helper function to parse JSON from the response
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

      // Save generated questions to the database
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

      // Fetch the newly saved questions (excluding answers)
      questions = await Question.find({ subject: groupSubject })
        .limit(parseInt(limit))
        .select('-answer');
    }

    // Add metadata about which group and areas we're focusing on
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

    // Validate required fields
    if (!title || !subject || !questions || !groupId) {
      return res.status(400).json({ error: 'Missing required fields: title, subject, questions, and groupId are required' });
    }

    // Verify the group exists and student is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is a member of the group
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

    // Ensure the quiz subject matches the group subject
    if (subject !== group.subject) {
      return res.status(400).json({ 
        error: 'Quiz subject must match the group subject',
        groupSubject: group.subject
      });
    }

    // Create the quiz
    const quiz = await Quiz.create({
      title,
      subject,
      difficulty: difficulty || 'medium',
      createdBy,
      questions,
    });

    // Create a quiz session if needed
    const session = await QuizSession.create({
      userId: createdBy,
      quizId: quiz._id,
      groupId: groupId,
      startTime: new Date(),
      isActive: false // Not active initially
    });

    // Create notifications for all group members except the creator
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

    // Find the user's group to get the subject
    const group = await Group.findById(groupId);
    if (!group) {
      console.log(`Group not found: ${groupId}`);
      return res.status(404).json({ error: 'Group not found' });
    }

    console.log(`Group found: ${group.name}, members: ${group.members.length}`);

    // Verify user is a member of the group
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

    // Format optional topic for the prompt
    const topicStr = topic ? `specifically about ${topic} within ${groupSubject}` : `on ${groupSubject}`;
    const difficultyLevel = difficulty || 'medium';

    // Create the prompt
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
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
        temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error Response:', data);
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Invalid API Response Structure:', data);
      throw new Error('Unexpected API response structure');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log("Received response from Gemini API");

    let questions;
    try {
      // Use the helper function to parse JSON from the response
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

    // Create a title from the topic or subject
    const quizTitle = topic 
      ? `${topic} in ${groupSubject} Quiz`
      : `${groupSubject} ${difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)} Quiz`;

    // Create the quiz linked to the group's subject
    const quiz = await Quiz.create({
      title: quizTitle,
      subject: groupSubject,
      difficulty: difficultyLevel,
      createdBy: userId,
      questions,
    });

    // Create a quiz session for tracking progress
    const session = await QuizSession.create({
      userId,
      quizId: quiz._id,
      groupId: groupId,
      startTime: new Date(),
      isActive: true
    });

    // Return minimal quiz details without answers
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
    
    // Fetch all quiz results for this student
    const results = await QuizResult.find({ userId })
      .sort({ createdAt: -1 }) // Most recent first
      .populate({
        path: 'quizId',
        select: 'title subject difficulty questions'
      });
      
    if (!results || results.length === 0) {
      return res.status(200).json([]);
    }
    
    // Filter out any results with null quizId (which could happen if quizzes were deleted)
    const validResults = results.filter(result => result.quizId != null);
    
    // Format the response
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

// Generate a quiz based on a specific resource content
exports.generateFromResource = async (req, res) => {
  try {
    console.log("generateFromResource called with body:", req.body);
    const userId = req.user._id;
    const { resourceId, difficulty = 'medium', numberOfQuestions = 5 } = req.body;

    // Validate required fields
    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }

    // Find the resource
    const Resource = require('../models/Resource');
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Verify user has access to the resource
    // (either created by the user or shared with the user)
    if (resource.sharedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        error: 'You do not have access to this resource'
      });
    }

    console.log(`Generating quiz for resource: ${resource.title}`);

    // Extract subject from the resource title
    const resourceSubject = resource.title.split(':')[0] || 'General';

    // Extract content for quiz generation
    const content = resource.content;
    if (!content || content.length < 100) {
      return res.status(400).json({
        error: 'Resource content is too short to generate a meaningful quiz'
      });
    }

    // Create the prompt for AI
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
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error Response:', data);
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(data)}`);
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Invalid API Response Structure:', data);
      throw new Error('Unexpected API response structure');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log("Received response from Gemini API");

    let questions;
    try {
      // Use the helper function to parse JSON from the response
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

    // Create a title based on the resource
    const quizTitle = `Quiz on: ${resource.title}`;

    // Create the quiz linked to the resource
    const quiz = await Quiz.create({
      title: quizTitle,
      subject: resourceSubject,
      difficulty: difficulty,
      createdBy: userId,
      questions,
      resourceId: resourceId // Link the quiz to the resource
    });

    // Create a quiz session for tracking progress
    const session = await QuizSession.create({
      userId,
      quizId: quiz._id,
      startTime: new Date(),
      isActive: true,
      resourceId: resourceId
    });

    // Add the quiz to corresponding learning path
    const LearningPath = require('../models/LearningPath');
    
    // Find learning paths that contain this resource
    const learningPaths = await LearningPath.find({
      studentId: userId,
      'resources.resourceId': resourceId
    });
    
    for (const path of learningPaths) {
      // Add the quiz to the learning path if it doesn't already exist
      const quizExists = path.quizzes.some(q => 
        q.quizId && q.quizId.toString() === quiz._id.toString()
      );
      
      if (!quizExists) {
        path.quizzes.push({
          quizId: quiz._id,
          completed: false
        });
        
        // Recalculate progress
        const totalItems = path.resources.length + path.quizzes.length;
        const completedResources = path.resources.filter(r => r.completed).length;
        const completedQuizzes = path.quizzes.filter(q => q.completed).length;
        
        path.progress = totalItems > 0 
          ? Math.round(((completedResources + completedQuizzes) / totalItems) * 100) 
          : 0;
        
        // Update path status based on progress
        if (path.progress === 100) {
          path.status = 'completed';
        } else if (path.status === 'completed' && path.progress < 100) {
          // If path was completed but adding a new quiz makes progress < 100%, set to active
          path.status = 'active';
        }
        
        await path.save();
        console.log(`Added quiz to learning path: ${path.title}`);
      }
    }

    // Return minimal quiz details without answers
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