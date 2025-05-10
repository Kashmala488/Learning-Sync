import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// API base URL
const API_URL = 'http://localhost:4000';

// Custom event name for resource completion updates
export const RESOURCE_COMPLETION_EVENT = 'resourceCompletionUpdated';

const LearningPaths = () => {
  const [learningPaths, setLearningPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Function to sync resources with learning paths
  const syncResources = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(`${API_URL}/api/students/sync-resources`, {}, config);
      
      // Fetch updated learning paths after sync
      fetchLearningPaths();
    } catch (err) {
      console.error('Error syncing resources:', err);
    } finally {
      setSyncing(false);
    }
  };

  const fetchLearningPaths = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`${API_URL}/api/students/learning-paths?_t=${timestamp}`, config);
      
      // Filter out learning paths with no resources
      const validLearningPaths = response.data.filter(path => 
        path.resources && path.resources.length > 0
      );
      
      // Ensure status is set correctly based on progress and remove duplicates
      const pathMap = new Map(); // Use a Map to ensure unique paths by title
      
      validLearningPaths.forEach(path => {
        // If progress is 100% but status is not completed, update it
        const updatedPath = path.progress === 100 && path.status !== 'completed' 
          ? { ...path, status: 'completed' } 
          : path;
          
        // If we already have a path with this title, keep the one with more resources
        if (!pathMap.has(updatedPath.title) || 
            pathMap.get(updatedPath.title).resources.length < updatedPath.resources.length) {
          pathMap.set(updatedPath.title, updatedPath);
        }
      });
      
      // Convert Map back to array
      const updatedPaths = Array.from(pathMap.values());
      
      setLearningPaths(updatedPaths);
    } catch (err) {
      console.error('Error fetching learning paths:', err);
      setError('Failed to load learning paths. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch - always fetch fresh data and sync resources
  useEffect(() => {
    // First sync resources, then fetch learning paths
    syncResources();
    
    // Set up refresh interval to keep data updated
    const refreshInterval = setInterval(() => {
      console.log('Refreshing learning paths data...');
      fetchLearningPaths();
    }, 30000); // Refresh every 30 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Event listener for resource completion updates
  useEffect(() => {
    // Function to handle resource completion event
    const handleResourceCompletionUpdate = () => {
      console.log('Resource completion updated, refreshing learning paths');
      fetchLearningPaths();
    };

    // Add event listener
    window.addEventListener(RESOURCE_COMPLETION_EVENT, handleResourceCompletionUpdate);

    // Clean up event listener
    return () => {
      window.removeEventListener(RESOURCE_COMPLETION_EVENT, handleResourceCompletionUpdate);
    };
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner size="lg" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Your Learning Paths</h2>
          <p className="text-gray-600">Follow your personalized learning journey</p>
        </div>
        {syncing && (
          <div className="flex items-center text-blue-600">
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Syncing resources...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : learningPaths.length > 0 ? (
          learningPaths.map(path => (
            <div key={path._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{path.title}</h3>
                    <p className="text-gray-600 mt-1">{path.description}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    path.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    path.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {path.status === 'completed' ? 'Completed' : 
                     path.status === 'active' ? 'In Progress' : 'Archived'}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium">{path.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        path.progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                      }`} 
                      style={{ width: `${path.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-gray-500 text-sm mb-1">Resources</div>
                    <div className="text-gray-800 font-medium">
                      {path.resources?.filter(r => r.completed).length || 0}/{path.resources?.length || 0} completed
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-gray-500 text-sm mb-1">Quizzes</div>
                    <div className="text-gray-800 font-medium">
                      {path.quizzes?.filter(q => q.completed).length || 0}/{path.quizzes?.length || 0} completed
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-gray-500 text-sm mb-1">Deadline</div>
                    <div className="text-gray-800 font-medium">
                      {path.deadline ? formatDate(path.deadline) : 'No deadline'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Link 
                    to={`/resources`} 
                    className={`px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors ${
                      path.status === 'completed' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {path.status === 'completed' ? 'Review Path' : 'Continue Learning'}
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-gray-500 mb-3">
              <i className="fas fa-book-open text-4xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Learning Paths Yet</h3>
            <p className="text-gray-600 mb-4">
              Create or access resources to automatically generate learning paths for your studies.
            </p>
            <Link 
              to="/resources" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
            >
              Explore Resources
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LearningPaths; 