import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

// API base URL
const API_URL = 'http://localhost:4000';

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        // Fetch only resources created by the current user
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };
        const response = await axios.get(`${API_URL}/api/resources/my-resources`, config);
        setResources(response.data);
      } catch (err) {
        console.error('Error fetching resources:', err);
        setError('Failed to load resources. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const rateResource = async (resourceId, rating) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      await axios.post(`${API_URL}/api/resources/${resourceId}/rate`, {
        score: rating
      }, config);
      
      // Update the resource rating in the state
      const updatedResources = resources.map(resource => {
        if (resource._id === resourceId) {
          // Calculate new average rating
          const newRatings = [...resource.ratings, { score: rating }];
          const avgRating = newRatings.reduce((sum, r) => sum + r.score, 0) / newRatings.length;
          
          return {
            ...resource,
            ratings: newRatings,
            averageRating: avgRating.toFixed(1)
          };
        }
        return resource;
      });
      
      setResources(updatedResources);
    } catch (err) {
      console.error('Error rating resource:', err);
    }
  };
  
  const handleDeleteResource = async (resourceId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.delete(`${API_URL}/api/resources/${resourceId}`, config);
      
      // Remove the deleted resource from the state
      setResources(resources.filter(resource => resource._id !== resourceId));
      setResourceToDelete(null);
      toast.success('Resource deleted successfully');
    } catch (err) {
      console.error('Error deleting resource:', err);
      toast.error('Failed to delete resource. Please try again.');
    }
  };

  // Filter resources based on search term and filters
  const filteredResources = resources.filter(resource => {
    // Filter by search term
    if (searchTerm && !resource.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by type
    if (filterType !== 'all') {
      const resourceType = getResourceType(resource);
      if (resourceType !== filterType) {
        return false;
      }
    }
    
    // Filter by rating
    if (filterRating !== 'all') {
      const minRating = parseInt(filterRating);
      if (parseFloat(resource.averageRating) < minRating) {
        return false;
      }
    }
    
    return true;
  });

  // Helper function to determine resource type based on content
  const getResourceType = (resource) => {
    if (resource.title.toLowerCase().includes('video')) return 'video';
    if (resource.title.toLowerCase().includes('article')) return 'article';
    if (resource.title.toLowerCase().includes('tutorial')) return 'tutorial';
    if (resource.title.toLowerCase().includes('quiz')) return 'quiz';
    return 'document';
  };

  // Helper function to get icon based on resource type
  const getResourceIcon = (type) => {
    switch (type) {
      case 'video':
        return 'fa-video';
      case 'article':
        return 'fa-file-alt';
      case 'tutorial':
        return 'fa-chalkboard-teacher';
      case 'quiz':
        return 'fa-question-circle';
      default:
        return 'fa-file';
    }
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Learning Resources</h2>
        <p className="text-gray-600">Manage your created learning materials</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Resources
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Resource Type Filter */}
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="article">Articles</option>
              <option value="tutorial">Tutorials</option>
              <option value="quiz">Quizzes</option>
              <option value="document">Documents</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Rating
            </label>
            <select
              id="rating-filter"
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
              <option value="1">1+ Stars</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const resourceType = getResourceType(resource);
            const iconClass = getResourceIcon(resourceType);
            
            return (
              <div key={resource._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3`}>
                      <i className={`fas ${iconClass} text-blue-600`}></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">{resource.title}</h3>
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => rateResource(resource._id, star)}
                              className="text-yellow-400 text-lg focus:outline-none"
                            >
                              <i className={`fas ${parseFloat(resource.averageRating) >= star ? 'fa-star' : 'fa-star-o'}`}></i>
                            </button>
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          ({resource.averageRating || '0'})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    {resource.content?.substring(0, 100)}
                    {resource.content?.length > 100 ? '...' : ''}
                  </p>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      Created: {new Date(resource.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setResourceToDelete(resource)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete resource"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      <Link
                        to={`/resources/${resource._id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Resource <i className="fas fa-arrow-right ml-1"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-gray-500 mb-3">
            <i className="fas fa-search text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Resources Found</h3>
          <p className="text-gray-600 mb-4">
            You haven't created any resources yet, or none match your search criteria.
          </p>
        </div>
      )}

      {/* AI-Generated Resources Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            AI-Generated Learning Materials
          </h3>
        </div>
        
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-md p-6">
          <div className="flex items-start space-x-6">
            <div className="bg-white p-4 rounded-full">
              <i className="fas fa-robot text-3xl text-blue-600"></i>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Having trouble with a specific topic?
              </h4>
              <p className="text-gray-700 mb-4">
                Our AI can generate personalized learning materials based on your needs. Just describe the topic you want to learn more about.
              </p>
              <Link
                to="/resources/generate"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Generate Learning Material
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {resourceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete Resource</h3>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{resourceToDelete.title}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setResourceToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteResource(resourceToDelete._id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Resources; 