import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// API base URL
const API_URL = 'http://localhost:4000';

const GroupSelection = () => {
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Redirect to dashboard if the user is not logged in
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchAvailableGroups = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Filter out groups that the user might already be a member of
        const userGroups = response.data.filter(group => 
          group.members && group.members.some(member => 
            typeof member === 'object' 
              ? member._id === currentUser.id 
              : member === currentUser.id
          )
        );
        
        // If user is already in groups, skip this step and go to dashboard
        if (userGroups.length > 0) {
          toast.info('You are already a member of one or more groups');
          navigate('/dashboard');
          return;
        }
        
        // Otherwise show available groups
        setAvailableGroups(response.data);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Failed to load available groups. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableGroups();
  }, [token, navigate, currentUser.id]);

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prevSelected => {
      if (prevSelected.includes(groupId)) {
        return prevSelected.filter(id => id !== groupId);
      } else {
        return [...prevSelected, groupId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedGroups.length === 0) {
      toast.warning('Please select at least one group to join');
      return;
    }

    setSubmitting(true);

    try {
      // Join each selected group
      const joinPromises = selectedGroups.map(groupId =>
        axios.post(`${API_URL}/api/groups/${groupId}/join`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      await Promise.all(joinPromises);
      
      toast.success('Successfully joined the selected groups!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error joining groups:', err);
      toast.error('Failed to join one or more groups. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full">
          <h2 className="text-2xl font-bold text-center text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4 text-center">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Join Learning Groups</h2>
            <p className="text-gray-600 text-center mb-8">
              Select the groups you'd like to join based on your interests and learning goals.
              You can always join or leave groups later from your dashboard.
            </p>

            {availableGroups.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No groups are currently available to join.</p>
                <button
                  onClick={handleSkip}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continue to Dashboard
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {availableGroups.map(group => (
                    <div key={group._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                      <p className="text-gray-600 mt-1">{group.description || 'No description available'}</p>
                      <div className="flex items-center mt-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {group.subject}
                        </span>
                        <span className="ml-2 text-gray-500 text-sm">
                          {group.members.length}/{group.maxMembers} members
                        </span>
                      </div>
                      {group.mentor && (
                        <div className="mt-2 flex items-center">
                          <span className="text-sm text-gray-600">
                            <span className="font-medium">Mentor:</span>{' '}
                            <Link 
                              to={`/teacher-profile/${group.mentor._id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {group.mentor.name || 'Teacher'} (View Profile)
                            </Link>
                          </span>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="rounded text-blue-600"
                            checked={selectedGroups.includes(group._id)}
                            onChange={() => handleGroupToggle(group._id)}
                          />
                          <span className="ml-2 text-gray-800">Join this group</span>
                        </label>
                        {selectedGroups.includes(group._id) && (
                          <span className="text-xs font-medium text-green-600">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || selectedGroups.length === 0}
                    className={`
                      px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {submitting ? 'Joining...' : 'Join Selected Groups'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSelection; 