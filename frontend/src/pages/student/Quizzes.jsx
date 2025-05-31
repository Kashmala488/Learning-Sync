import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faQuestionCircle, 
  faFilter, 
  faHistory,
  faSearch,
  faBook,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
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

const Quizzes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  // Extract resourceId from URL parameters if present
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const resourceId = queryParams.get('resourceId');
    
    if (resourceId) {
      // Clear the query parameter to avoid repeated modal opening on refresh
      navigate('/quizzes', { replace: true });
      
      // Set a flag to fetch and select this resource
      localStorage.setItem('pendingResourceForQuiz', resourceId);
    }
  }, [location.search, navigate]);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const authAxios = getAuthAxios();
        const response = await authAxios.get('/api/resources/my-resources');
        setResources(response.data);
        
        // Check if there's a pending resource to generate quiz from
        const pendingResourceId = localStorage.getItem('pendingResourceForQuiz');
        if (pendingResourceId) {
          localStorage.removeItem('pendingResourceForQuiz');
          
          // Find the resource in the fetched resources
          const foundResource = response.data.find(r => r._id === pendingResourceId);
          if (foundResource) {
            setSelectedResource(foundResource);
            setShowGenerateModal(true);
          } else {
            toast.error('Could not find the specified resource');
          }
        }
      } catch (err) {
        console.error('Error fetching resources:', err);
        setError('Failed to load resources. Please try again later.');
        toast.error('Failed to load resources');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  // Filter resources based on search term
  const filteredResources = resources.filter(resource => {
    if (!searchTerm) return true;
    return resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           resource.content.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle resource selection for quiz generation
  const handleResourceSelect = (resource) => {
    setSelectedResource(resource);
    setShowGenerateModal(true);
  };

  // Handle quiz generation
  const handleGenerateQuiz = async () => {
    if (!selectedResource) {
      toast.error('Please select a resource first');
      return;
    }

    setGeneratingQuiz(true);
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/quizzes/generate-from-resource', {
        resourceId: selectedResource._id,
        difficulty,
        numberOfQuestions: 5 // Default number of questions
      });

      // If the API returns a quizId, navigate to the quiz page
      if (response.data && response.data._id) {
        toast.success('Quiz generated successfully!');
        setShowGenerateModal(false);
        navigate(`/quizzes/${response.data._id}`);
      } else {
        toast.error('Failed to generate quiz. Please try again.');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      toast.error(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading resources...</p>
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
        {/* Header with navigation tabs */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Quizzes</h1>
          
          <div className="flex space-x-4">
            <Link to="/previous-quizzes" className="flex items-center text-blue-600 hover:text-blue-800">
              <FontAwesomeIcon icon={faHistory} className="mr-2" />
              View Previous Quizzes
            </Link>
          </div>
        </div>

        {/* Search and filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative w-full md:w-auto flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search resources..."
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Resources section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Resources</h2>
          
          {filteredResources.length === 0 ? (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faBook} className="text-3xl text-gray-400 mb-2" />
              <p className="text-gray-600 mb-4">
                {resources.length === 0 
                  ? "You haven't created any resources yet." 
                  : "No resources match your search criteria."}
              </p>
              <Link
                to="/resources/generate"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Create a Resource
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResources.map(resource => (
                <div key={resource._id} className="border rounded-md p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">{resource.title}</h3>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {resource.content.substring(0, 150)}
                        {resource.content.length > 150 ? '...' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResourceSelect(resource)}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                      Generate Quiz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quiz Generation Modal */}
      {showGenerateModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Generate Quiz from Resource
            </h3>
            
            <p className="text-gray-600 mb-4">
              Generate a quiz based on: <span className="font-semibold">{selectedResource.title}</span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                disabled={generatingQuiz}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateQuiz}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={generatingQuiz}
              >
                {generatingQuiz ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Generating...</span>
                  </>
                ) : (
                  <>Generate Quiz</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Quizzes; 