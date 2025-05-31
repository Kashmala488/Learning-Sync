import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const PreviousQuizzes = () => {
  const navigate = useNavigate();
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPreviousQuizzes = async () => {
      setLoading(true);
      try {
        console.log('Fetching previous quizzes...');
        const authAxios = getAuthAxios();
        const response = await authAxios.get('/api/quizzes/student/results');
        console.log('Quiz results response:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          // Filter out any results with null quizId (which could happen if quizzes were deleted)
          const validResults = response.data.filter(result => result && result.quizId);
          if (validResults.length < response.data.length) {
            console.log(`Filtered out ${response.data.length - validResults.length} results with missing quiz data`);
          }
          setQuizResults(validResults);
        } else {
          console.error('Invalid response format:', response.data);
          setError('Received invalid data format from server');
          toast.error('Failed to load quiz results: Invalid data format');
        }
      } catch (err) {
        console.error('Failed to fetch quiz results:', err.response?.data || err.message);
        setError('Failed to load your previous quiz results. Please try again later.');
        toast.error('Failed to load your previous quiz results');
      } finally {
        setLoading(false);
      }
    };

    fetchPreviousQuizzes();
  }, []);

  // Format date to a readable string
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get background color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  // Handle viewing quiz details/feedback
  const handleViewQuizDetails = (quizId, resultId) => {
    try {
      // Log data for debugging
      console.log('Viewing quiz details:', { quizId, resultId });
      
      // Make sure quizId is a string
      const quizIdString = quizId.toString();
      
      // Navigate to the feedback route
      navigate(`/quizzes/${quizIdString}/feedback`);
    } catch (err) {
      console.error('Error viewing quiz details:', err);
      toast.error('Failed to load quiz details. Please try again.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading your quiz history...</p>
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
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Your Previous Quizzes
        </h1>

        {quizResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-4">You haven't taken any quizzes yet.</p>
            <button
              onClick={() => navigate('/quizzes/practice')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Take a Quiz
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Quiz</th>
                    <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Subject</th>
                    <th className="py-3 px-6 text-center text-sm font-medium text-gray-600">Questions</th>
                    <th className="py-3 px-6 text-center text-sm font-medium text-gray-600">Score</th>
                    <th className="py-3 px-6 text-center text-sm font-medium text-gray-600">Date Completed</th>
                    <th className="py-3 px-6 text-center text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quizResults.map((result) => (
                    <tr key={result.resultId} className="hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm text-gray-800">{result.title}</td>
                      <td className="py-4 px-6 text-sm text-gray-800">{result.subject}</td>
                      <td className="py-4 px-6 text-sm text-center text-gray-800">{result.numberOfQuestions}</td>
                      <td className="py-4 px-6 text-sm text-center">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(result.score)}`}
                        >
                          {result.score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-center text-gray-600">{formatDate(result.completedAt)}</td>
                      <td className="py-4 px-6 text-sm text-center">
                        <button
                          onClick={() => handleViewQuizDetails(result.quizId, result.resultId)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate('/quizzes/practice')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mr-4"
          >
            Take a New Quiz
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PreviousQuizzes; 