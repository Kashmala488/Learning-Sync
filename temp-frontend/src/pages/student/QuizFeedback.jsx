import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

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

const QuizFeedback = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const authAxios = getAuthAxios();
        
        // Fetch the quiz details first
        const quizResponse = await authAxios.get(`/api/quizzes/${quizId}`);
        setQuiz(quizResponse.data);
        
        // Then fetch the feedback for this quiz
        const feedbackResponse = await authAxios.get(`/api/quizzes/${quizId}/feedback`);
        console.log('Feedback response:', feedbackResponse.data);
        
        if (feedbackResponse.data && typeof feedbackResponse.data === 'object') {
          setFeedbackData(feedbackResponse.data);
        } else {
          throw new Error('Invalid feedback data format');
        }
      } catch (err) {
        console.error('Failed to fetch quiz feedback:', err.response?.data || err.message);
        setError('Failed to load quiz feedback. Please try again later.');
        toast.error('Failed to load quiz feedback');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchFeedback();
    }
  }, [quizId]);

  // Render question-by-question feedback
  const renderFeedbackItems = () => {
    // Check if feedback data is available in the expected format
    if (!feedbackData || !feedbackData.feedback) return null;
    
    // Handle different possible structures of feedback data
    const feedbackItems = Array.isArray(feedbackData.feedback)
      ? feedbackData.feedback
      : typeof feedbackData.feedback === 'object' && feedbackData.feedback.feedback && Array.isArray(feedbackData.feedback.feedback)
        ? feedbackData.feedback.feedback
        : null;
    
    if (!feedbackItems || feedbackItems.length === 0) {
      return (
        <div className="p-4 bg-yellow-50 rounded-md">
          <p className="text-yellow-800">No detailed feedback available for this quiz.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {feedbackItems.map((item, index) => (
          <div 
            key={index}
            className={`p-4 rounded-md ${item.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <p className="font-medium mb-2">{item.question}</p>
            <p className="text-sm mb-1">
              <span className="font-semibold">Your answer:</span> {item.selectedAnswer || 'Not answered'}
            </p>
            {!item.isCorrect && item.correctAnswer && (
              <p className="text-sm mb-1">
                <span className="font-semibold">Correct answer:</span> {item.correctAnswer}
              </p>
            )}
            {item.explanation && (
              <p className="text-sm mt-2">{typeof item.explanation === 'string' ? item.explanation : 'No explanation available'}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading quiz feedback...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 p-4 rounded-md text-red-800 mb-4">
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate('/previous-quizzes')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Quiz History
        </button>
      </DashboardLayout>
    );
  }

  if (!feedbackData || !quiz) {
    return (
      <DashboardLayout>
        <div className="bg-yellow-50 p-4 rounded-md text-yellow-800 mb-4">
          <p>Quiz feedback not available. The quiz may have been deleted.</p>
        </div>
        <button
          onClick={() => navigate('/previous-quizzes')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Quiz History
        </button>
      </DashboardLayout>
    );
  }

  // Calculate score if available in results
  const score = feedbackData.score !== undefined ? 
    feedbackData.score : 
    (feedbackData.feedback && Array.isArray(feedbackData.feedback)) ? 
      (feedbackData.feedback.filter(item => item.isCorrect).length / feedbackData.feedback.length) * 100 : 
      0;
  
  // Check if we have feedback items to display
  const feedbackItems = renderFeedbackItems();
  const hasFeedbackItems = !!feedbackItems;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Quiz Feedback: {quiz.title}
          </h1>
          <div className="flex items-center">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
              {quiz.subject}
            </span>
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
              {quiz.difficulty}
            </span>
          </div>
        </div>

        {/* Feedback summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Summary</h2>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700">Your Score</span>
              <span className="text-xl font-bold">{Math.round(score)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  score >= 80 ? 'bg-green-600' : 
                  score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>
          
          {/* Add metrics for total questions, correct and incorrect questions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-500 text-sm">Total Questions</p>
              <p className="text-2xl font-semibold">
                {feedbackData.totalQuestions || 
                 (feedbackData.feedback && Array.isArray(feedbackData.feedback) ? 
                  feedbackData.feedback.length : 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-500 text-sm">Correct Answers</p>
              <p className="text-2xl font-semibold text-green-600">
                {feedbackData.correctAnswers || 
                 (feedbackData.feedback && Array.isArray(feedbackData.feedback) ? 
                  feedbackData.feedback.filter(item => item.isCorrect).length : 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-gray-500 text-sm">Incorrect Answers</p>
              <p className="text-2xl font-semibold text-red-600">
                {feedbackData.totalQuestions && feedbackData.correctAnswers ? 
                 (feedbackData.totalQuestions - feedbackData.correctAnswers) : 
                 (feedbackData.feedback && Array.isArray(feedbackData.feedback) ? 
                  feedbackData.feedback.filter(item => !item.isCorrect).length : 0)}
              </p>
            </div>
          </div>
          
          {feedbackData.message && (
            <div className="p-4 bg-blue-50 rounded-md text-gray-700">
              {feedbackData.message}
            </div>
          )}
        </div>

        {/* Question-by-question feedback - only show if we have feedback items */}
        {hasFeedbackItems && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Question Details</h2>
            {feedbackItems}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => navigate('/previous-quizzes')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Back to Quiz History
          </button>
          
          <button
            onClick={() => navigate('/quizzes/practice')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Take Another Quiz
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuizFeedback; 