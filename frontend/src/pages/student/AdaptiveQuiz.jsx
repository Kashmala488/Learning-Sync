import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

// API base URL
const API_URL = 'http://localhost:4000';

// Helper function to get authenticated axios instance
const getAuthAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

const AdaptiveQuiz = () => {
  const { userRole } = useAuth();
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPracticeQuiz = !quizId || quizId === 'practice';
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [difficultyLevel, setDifficultyLevel] = useState('medium');
  
  // Clear userGroups and selectedGroup variables as they're no longer needed
  // Use resources instead
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);

  // Define debug functions at component level for access throughout
  const debugApi = async (endpoint, method = 'GET', data = null) => {
    try {
      const authAxios = getAuthAxios();
      const options = {
        method,
        url: endpoint
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.data = data;
      }
      
      const response = await authAxios(options);
      console.log(`[Debug API] ${method} ${endpoint}:`, response.data);
      return response.data;
    } catch (err) {
      console.error(`[Debug API Error] ${method} ${endpoint}:`, err.response?.data || err.message);
      throw err;
    }
  };

  // Function to fetch user's resources (for practice quiz selection)
  useEffect(() => {
    const fetchResources = async () => {
      if (isPracticeQuiz) {
        try {
          const authAxios = getAuthAxios();
          const response = await authAxios.get('/api/resources/my-resources');
          setResources(response.data);
        } catch (err) {
          console.error('Error fetching resources:', err);
          setError('Failed to load resources. Please try again later.');
        }
      }
    };

    fetchResources();
  }, [isPracticeQuiz]);

  // Modified function to handle resource selection for practice quizzes
  const handleResourceSelect = (resource) => {
    setSelectedResource(resource);
  };

  // Main quiz fetching logic
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const authAxios = getAuthAxios();
        
        // For specific quiz ID
        if (!isPracticeQuiz) {
          const response = await authAxios.get(`/api/quizzes/${quizId}`);
          setQuiz(response.data);
          
          // Initialize answers array with empty values
          setAnswers(new Array(response.data.questions.length).fill(''));
          
          // Set initial time based on number of questions (e.g., 2 minutes per question)
          setTimeLeft(response.data.questions.length * 120);
        } 
        // For practice quizzes, redirect to the quizzes page 
        // This component no longer handles practice quiz generation
        else {
          navigate('/quizzes');
          return;
        }
      } catch (err) {
        console.error("Quiz fetch error:", err);
        setError(`Failed to load quiz: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch quiz if we have a specific quizId
    if (!isPracticeQuiz) {
      fetchQuiz();
    }
    
    // Set up timer only if we have a quiz
    let timer;
    if (quiz && timeLeft !== null) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // Clean up timer on unmount
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [quizId, isPracticeQuiz, navigate]);

  // Format time from seconds to mm:ss
  const formatTime = (seconds) => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Update answer for current question
  const handleAnswerSelect = (option) => {
    setSelectedAnswer(option);
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = option;
    setAnswers(newAnswers);
  };
  
  // Navigate to next question
  const handleNextQuestion = () => {
    setShowFeedback(false);
    setShowHint(false);
    setSelectedAnswer('');
    setCurrentQuestionIndex(prev => prev + 1);
  };
  
  // Navigate to previous question
  const handlePrevQuestion = () => {
    setShowFeedback(false);
    setShowHint(false);
    setSelectedAnswer(answers[currentQuestionIndex - 1]);
    setCurrentQuestionIndex(prev => prev - 1);
  };
  
  // Request a hint for the current question
  const handleRequestHint = async () => {
    try {
      if (!isPracticeQuiz) {
        // For specific quizzes, make an API call
        const authAxios = getAuthAxios();
        const response = await authAxios.post(`/api/quizzes/${quizId}/hint`, {
          questionIndex: currentQuestionIndex
        });
        // Use API response hint if available
        if (response.data && response.data.hint) {
          // Update quiz question with the received hint
          const updatedQuiz = { ...quiz };
          updatedQuiz.questions[currentQuestionIndex].hint = response.data.hint;
          setQuiz(updatedQuiz);
        }
      }
      
      setShowHint(true);
    } catch (err) {
      console.error("Hint request error:", err);
      toast.error('Failed to get hint. Please try again.');
    }
  };
  
  // Flag a question for review
  const handleFlagQuestion = async () => {
    try {
      if (!isPracticeQuiz) {
        const authAxios = getAuthAxios();
        await authAxios.post(`/api/quizzes/${quizId}/flag`, {
          questionIndex: currentQuestionIndex,
          reason: 'Student flagged for review'
        });
      }
      
      toast.success('Question flagged for review.');
    } catch (err) {
      console.error("Flag question error:", err);
      toast.error('Failed to flag question. Please try again.');
    }
  };
  
  // Replace the renderGroupSelection function with a simpler message
  const renderPracticeInfo = () => {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Resource-Based Quizzes</h2>
          
          <p className="text-gray-600 mb-4">
            You can now generate quizzes based on your learning resources.
          </p>
          
          <button
            onClick={() => navigate('/quizzes')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Quiz Page
          </button>
        </div>
      </DashboardLayout>
    );
  };

  // Replace the handleGroupSelect function with a stub since we're no longer using it
  const handleGroupSelect = () => {
    navigate('/quizzes');
  };

  // Replace quiz submission to include resource reference if available
  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    
    try {
      const authAxios = getAuthAxios();
      
      if (!isPracticeQuiz) {
        const response = await authAxios.post(`/api/quizzes/${quizId}/submit`, {
          answers: answers.map((answer, index) => ({
            questionIndex: index,
            selectedAnswer: answer
          }))
        });
        
        setFeedbackData(response.data);
      } else {
        // For practice quizzes generated from resources
        // Calculate results locally first
        const correctAnswers = answers.reduce((count, answer, index) => {
          return answer === quiz.questions[index].answer ? count + 1 : count;
        }, 0);
        
        const score = Math.round((correctAnswers / answers.length) * 100);
        
        // Generate appropriate feedback based on score
        let feedbackMessage = "";
        if (score >= 80) {
          feedbackMessage = "Excellent work! You have a strong grasp of the concepts.";
        } else if (score >= 60) {
          feedbackMessage = "Good job! You understand most of the material, but there's room for improvement.";
        } else {
          feedbackMessage = "You might need more practice with these concepts. Consider reviewing the material again.";
        }
        
        const mockFeedback = {
          score,
          totalQuestions: answers.length,
          correctAnswers,
          feedback: feedbackMessage,
          questionFeedback: answers.map((answer, index) => {
            const question = quiz.questions[index];
            const isCorrect = answer === question.answer;
            return {
              questionIndex: index,
              isCorrect,
              correctAnswer: question.answer,
              explanation: isCorrect 
                ? 'Correct! Well done.' 
                : `Incorrect. The correct answer is "${question.answer}".`
            };
          })
        };
        
        setFeedbackData(mockFeedback);
      }
      
      setShowFeedback(true);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      toast.error("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Show practice info if no quiz is loaded and we're in practice mode
  if (isPracticeQuiz) {
    return renderPracticeInfo();
  }

  if (loading) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <LoadingSpinner size="lg" />
      </DashboardLayout>
    );
  }
  
  if (error) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!quiz) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
          <p>Could not find or generate quiz. Please try again or select a different subject.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate progress percentage
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  
  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Render feedback after quiz submission
  if (showFeedback && feedbackData) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Quiz Results</h2>
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700">Score</span>
              <span className="text-2xl font-bold">{feedbackData.score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  feedbackData.score >= 80 ? 'bg-green-600' : 
                  feedbackData.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${feedbackData.score}%` }}
              ></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-500 text-sm">Total Questions</p>
              <p className="text-2xl font-semibold">{feedbackData.totalQuestions}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-500 text-sm">Correct Answers</p>
              <p className="text-2xl font-semibold text-green-600">{feedbackData.correctAnswers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-500 text-sm">Incorrect Answers</p>
              <p className="text-2xl font-semibold text-red-600">
                {feedbackData.totalQuestions - feedbackData.correctAnswers}
              </p>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Feedback</h3>
            <p className="text-gray-700 p-4 bg-blue-50 rounded-md">{feedbackData.feedback}</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Question Details</h3>
            
            {feedbackData.questionFeedback?.map((qFeedback, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-md ${qFeedback.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
              >
                <p className="font-medium mb-2">
                  Question {index + 1}: {quiz.questions[qFeedback.questionIndex].question}
                </p>
                <p className="text-sm mb-1">
                  <span className="font-semibold">Your answer:</span> {answers[qFeedback.questionIndex] || 'Not answered'}
                </p>
                {!qFeedback.isCorrect && (
                  <p className="text-sm mb-1">
                    <span className="font-semibold">Correct answer:</span> {qFeedback.correctAnswer}
                  </p>
                )}
                <p className="text-sm mt-2">{qFeedback.explanation}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Return to Dashboard
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/learning-paths')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Continue Learning
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={userRole || 'student'}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Quiz Header */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{quiz.title}</h2>
            
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 px-3 py-1 rounded-full text-sm">
                {quiz.subject}
              </div>
              <div className="bg-blue-500 px-3 py-1 rounded-full text-sm">
                {quiz.difficulty}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                timeLeft > 300 ? 'bg-green-500' : 
                timeLeft > 120 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                <i className="fas fa-clock mr-1"></i> {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-blue-400 rounded-full h-2 mt-4">
            <div 
              className="bg-white h-2 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-sm mt-1">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </div>
        </div>
        
        {/* Question */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">{currentQuestion.question}</h3>
            
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div 
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedAnswer === option 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 mr-3 rounded-full flex items-center justify-center ${
                      selectedAnswer === option 
                        ? 'bg-blue-500 text-white' 
                        : 'border border-gray-400'
                    }`}>
                      {selectedAnswer === option && <i className="fas fa-check text-xs"></i>}
                    </div>
                    <span>{option}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Hint */}
          {showHint && currentQuestion.hint && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-6">
              <div className="flex items-start">
                <i className="fas fa-lightbulb text-yellow-500 mt-1 mr-2"></i>
                <div>
                  <p className="font-medium text-gray-800 mb-1">Hint:</p>
                  <p className="text-gray-700">{currentQuestion.hint}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex flex-wrap justify-between items-center mt-8">
            <div className="flex space-x-3 mb-4 sm:mb-0">
              <button
                onClick={handleRequestHint}
                className="px-3 py-2 border border-yellow-400 text-yellow-700 rounded-md hover:bg-yellow-50"
                disabled={showHint}
              >
                <i className="fas fa-lightbulb mr-1"></i> Need a Hint?
              </button>
              <button
                onClick={handleFlagQuestion}
                className="px-3 py-2 border border-red-400 text-red-700 rounded-md hover:bg-red-50"
              >
                <i className="fas fa-flag mr-1"></i> Flag Question
              </button>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handlePrevQuestion}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </button>
              
              {currentQuestionIndex < quiz.questions.length - 1 ? (
                <button
                  onClick={handleNextQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!selectedAnswer}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={submitting || !selectedAnswer}
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdaptiveQuiz;