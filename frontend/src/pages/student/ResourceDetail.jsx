import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStar, 
  faShareAlt, 
  faDownload, 
  faBookmark,
  faArrowLeft,
  faFileAlt,
  faVideo,
  faChalkboardTeacher,
  faTrash,
  faQuestionCircle,
  faCheckCircle,
  faCircle
} from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { RESOURCE_COMPLETION_EVENT } from './LearningPaths';

// API base URL
const API_URL = 'http://localhost:4000';

const ResourceDetail = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareGroups, setShareGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Fetch resource details
  useEffect(() => {
    const fetchResource = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };
        
        const response = await axios.get(`${API_URL}/api/resources/${resourceId}`, config);
        setResource(response.data);
        
        // Check if user has already rated this resource
        if (response.data.ratings && response.data.ratings.length > 0) {
          const userRatingObj = response.data.ratings.find(
            rating => rating.user === currentUser?._id
          );
          if (userRatingObj) {
            setUserRating(userRatingObj.score);
          }
        }

        // Check if user has already completed this resource
        if (response.data.completedBy && response.data.completedBy.length > 0) {
          const isUserCompleted = response.data.completedBy.some(
            entry => entry.user === currentUser?.id
          );
          setIsCompleted(isUserCompleted);
        }
      } catch (err) {
        console.error('Error fetching resource:', err);
        setError('Failed to load resource. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (resourceId) {
      fetchResource();
    }
  }, [resourceId, currentUser]);

  // Fetch user's groups for sharing
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };
        
        const response = await axios.get(`${API_URL}/api/groups`, config);
        setShareGroups(response.data);
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };

    if (showShareModal) {
      fetchUserGroups();
    }
  }, [showShareModal]);

  // Handle star rating
  const handleRateResource = async (rating) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(
        `${API_URL}/api/resources/${resourceId}/rate`, 
        { score: rating },
        config
      );
      
      setUserRating(rating);
      
      // Update resource state with new rating
      setResource(prevResource => {
        // Calculate new average rating
        const existingRating = prevResource.ratings.find(
          r => r.user === currentUser?._id
        );
        
        let newRatings;
        if (existingRating) {
          newRatings = prevResource.ratings.map(r => 
            r.user === currentUser?._id ? { ...r, score: rating } : r
          );
        } else {
          newRatings = [...prevResource.ratings, { user: currentUser?._id, score: rating }];
        }
        
        const sum = newRatings.reduce((acc, r) => acc + r.score, 0);
        const avgRating = (sum / newRatings.length).toFixed(1);
        
        return {
          ...prevResource,
          ratings: newRatings,
          averageRating: avgRating
        };
      });
      
      toast.success('Rating submitted successfully!');
    } catch (err) {
      console.error('Error rating resource:', err);
      toast.error('Failed to submit rating. Please try again.');
    }
  };

  // Toggle group selection for sharing
  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prevSelected => {
      if (prevSelected.includes(groupId)) {
        return prevSelected.filter(id => id !== groupId);
      } else {
        return [...prevSelected, groupId];
      }
    });
  };

  // Share resource with selected groups
  const handleShareResource = async () => {
    if (selectedGroups.length === 0) {
      toast.warning('Please select at least one group to share with');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(
        `${API_URL}/api/resources/${resourceId}/share`, 
        { groupIds: selectedGroups },
        config
      );
      
      setShowShareModal(false);
      setSelectedGroups([]);
      toast.success('Resource shared successfully!');
    } catch (err) {
      console.error('Error sharing resource:', err);
      toast.error('Failed to share resource. Please try again.');
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.delete(`${API_URL}/api/resources/${resourceId}`, config);
      toast.success('Resource deleted successfully');
      navigate('/resources');
    } catch (err) {
      console.error('Error deleting resource:', err);
      toast.error('Failed to delete resource. Please try again.');
    }
  };

  // Handle generating a quiz from this resource
  const handleGenerateQuiz = () => {
    navigate(`/quizzes?resourceId=${resourceId}`);
  };

  // Handle marking resource as complete/incomplete
  const handleToggleCompletion = async () => {
    try {
      setMarkingComplete(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const newCompletionStatus = !isCompleted;
      
      const response = await axios.post(
        `${API_URL}/api/resources/${resourceId}/complete`,
        { isCompleted: newCompletionStatus },
        config
      );
      
      setIsCompleted(newCompletionStatus);
      toast.success(response.data.message);
      
      // Update the resource with the new completedBy data
      if (response.data.resource) {
        setResource(response.data.resource);
      }
      
      // Dispatch custom event to notify learning paths to refresh
      window.dispatchEvent(new Event(RESOURCE_COMPLETION_EVENT));
    } catch (err) {
      console.error('Error updating completion status:', err);
      toast.error('Failed to update completion status. Please try again.');
    } finally {
      setMarkingComplete(false);
    }
  };

  // Determine icon based on resource type
  const getResourceIcon = () => {
    if (!resource) return faFileAlt;
    
    const title = resource.title.toLowerCase();
    if (title.includes('video')) return faVideo;
    if (title.includes('tutorial')) return faChalkboardTeacher;
    return faFileAlt;
  };

  if (loading) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <LoadingSpinner size="lg" />
      </DashboardLayout>
    );
  }

  if (error || !resource) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{error || 'Resource not found'}</p>
          <button
            onClick={() => navigate('/resources')}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Back to Resources
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={userRole || 'student'}>
      {/* Resource Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <button
          onClick={() => navigate('/resources')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to Resources
        </button>
        
        <div className="flex items-start">
          <div className="bg-blue-100 p-4 rounded-lg mr-4">
            <FontAwesomeIcon icon={getResourceIcon()} className="text-blue-600 text-3xl" />
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{resource.title}</h2>
            
            <div className="flex items-center mb-2">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRateResource(star)}
                    className={`text-xl focus:outline-none ${
                      star <= userRating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    <FontAwesomeIcon icon={faStar} />
                  </button>
                ))}
              </div>
              <span className="text-gray-600">
                ({resource.averageRating || '0'}) • {resource.ratings?.length || 0} ratings
              </span>
            </div>
            
            <div className="flex flex-wrap items-center text-sm text-gray-600">
              <span>Shared by: {resource.sharedBy?.name || 'Unknown'}</span>
              <span className="mx-2">•</span>
              <span>Created: {new Date(resource.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleToggleCompletion}
              disabled={markingComplete}
              className={`px-3 py-2 text-sm rounded-md flex items-center ${
                isCompleted 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon 
                icon={isCompleted ? faCheckCircle : faCircle} 
                className={`mr-2 ${isCompleted ? 'text-green-600' : 'text-gray-500'}`} 
              />
              {markingComplete ? 'Updating...' : (isCompleted ? 'Completed' : 'Mark Complete')}
            </button>
            
            <button
              onClick={handleGenerateQuiz}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
            >
              <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
              Generate Quiz
            </button>
            
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-100"
              title="Share Resource"
            >
              <FontAwesomeIcon icon={faShareAlt} />
            </button>
            
            {/* Only show delete button if user is the creator */}
            {resource.sharedBy?._id === currentUser?.id && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-100"
                title="Delete Resource"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Resource Content */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="prose max-w-none">
          <ReactMarkdown>{resource.content}</ReactMarkdown>
        </div>
      </div>
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Share Resource</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Select the groups you want to share this resource with:
              </p>
              
              {shareGroups.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {shareGroups.map(group => (
                    <div 
                      key={group._id}
                      className={`p-3 border rounded-md cursor-pointer ${
                        selectedGroups.includes(group._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                      onClick={() => toggleGroupSelection(group._id)}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 mr-3 flex items-center justify-center rounded-full ${
                          selectedGroups.includes(group._id) 
                            ? 'bg-blue-500 text-white' 
                            : 'border border-gray-400'
                        }`}>
                          {selectedGroups.includes(group._id) && <FontAwesomeIcon icon={faStar} className="text-xs" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{group.name}</h4>
                          <p className="text-xs text-gray-500">{group.members?.length || 0} members • {group.subject}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  You are not a member of any groups yet.
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSelectedGroups([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleShareResource}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={selectedGroups.length === 0}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete Resource</h3>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this resource? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteResource}
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

export default ResourceDetail; 