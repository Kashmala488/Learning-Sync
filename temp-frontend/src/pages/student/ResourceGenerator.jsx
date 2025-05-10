import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

// API base URL
const API_URL = 'http://localhost:4000';

const ResourceGenerator = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatingResource, setGeneratingResource] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    difficulty: 'medium',
    contentLength: 'medium'
  });
  const [apiError, setApiError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear any previous errors when the user changes input
    if (apiError) setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    
    setGeneratingResource(true);
    setApiError(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      // Call the API to generate a resource
      const response = await axios.post(
        `${API_URL}/api/resources/generate`,
        formData,
        config
      );
      
      toast.success('Resource generated successfully!');
      
      // Navigate to the newly created resource
      navigate(`/resources/${response.data._id}`);
    } catch (err) {
      console.error('Error generating resource:', err);
      
      // Handle different types of errors
      if (err.response?.data?.code === 'INSUFFICIENT_CREDITS') {
        setApiError({
          type: 'credits',
          message: 'Resource generation is temporarily unavailable due to API limitations. You may still use template content.'
        });
        
        toast.warn('Using simplified template content due to API limitations.');
        
        // If we still got a resource despite the error, navigate to it
        if (err.response?.data?.resourceId) {
          navigate(`/resources/${err.response.data.resourceId}`);
          return;
        }
      } else if (err.response?.status === 401) {
        setApiError({
          type: 'auth',
          message: 'Authentication error. Please log in again.'
        });
      } else {
        setApiError({
          type: 'general',
          message: err.response?.data?.error || 'Failed to generate resource. Please try again later.'
        });
      }
      
      toast.error(err.response?.data?.error || 'Failed to generate resource. Please try again.');
    } finally {
      setGeneratingResource(false);
    }
  };

  return (
    <DashboardLayout role={userRole || 'student'}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Generate Learning Resource</h2>
        <p className="text-gray-600">Create personalized AI-generated learning materials</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {apiError?.type === 'credits' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 mb-4 rounded-md">
            <h4 className="font-medium mb-1">API Credits Limited</h4>
            <p className="text-sm">{apiError.message}</p>
            <p className="text-sm mt-1">You can still continue to generate a simplified template resource.</p>
          </div>
        )}
        
        {apiError?.type === 'general' && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 mb-4 rounded-md">
            <h4 className="font-medium mb-1">Error</h4>
            <p className="text-sm">{apiError.message}</p>
          </div>
        )}
        
        {generatingResource ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Generating your personalized resource...</p>
            <p className="mt-2 text-sm text-gray-500">This may take up to a minute. Please be patient.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject or Topic*
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="E.g., JavaScript Promises, Linear Algebra, Climate Change"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Be as specific as possible for better results
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Beginner</option>
                  <option value="medium">Intermediate</option>
                  <option value="hard">Advanced</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="contentLength" className="block text-sm font-medium text-gray-700 mb-1">
                  Content Length
                </label>
                <select
                  id="contentLength"
                  name="contentLength"
                  value={formData.contentLength}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="short">Short (~300 words)</option>
                  <option value="medium">Medium (~600 words)</option>
                  <option value="long">Long (~1000 words)</option>
                </select>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>Our AI will generate educational content based on your specifications</li>
                <li>The content is tailored to your learning needs and academic level</li>
                <li>You can share generated resources with other students</li>
                <li>Content generation may take up to a minute to complete</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/resources')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={generatingResource}
              >
                Generate Resource
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResourceGenerator; 