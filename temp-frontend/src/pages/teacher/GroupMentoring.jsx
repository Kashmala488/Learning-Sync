import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

// API base URL
const API_URL = 'http://localhost:4000';

const GroupMentoring = () => {
  const { token, userRole } = useAuth();
  const [availableGroups, setAvailableGroups] = useState([]);
  const [mentoredGroups, setMentoredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('available-groups');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        // Fetch available groups (without mentors)
        const availableResponse = await axios.get(`${API_URL}/api/groups/mentor/available`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch groups mentored by this teacher
        const mentoredResponse = await axios.get(`${API_URL}/api/groups/mentor/my-groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setAvailableGroups(availableResponse.data);
        setMentoredGroups(mentoredResponse.data);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Failed to load groups. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchGroups();
    }
  }, [token]);

  const handleBecomeMentor = async (groupId) => {
    try {
      const response = await axios.post(`${API_URL}/api/groups/${groupId}/mentor/assign`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the lists
      const menteredGroup = availableGroups.find(g => g._id === groupId);
      if (menteredGroup) {
        // Add to mentored groups
        setMentoredGroups([...mentoredGroups, {...menteredGroup, mentor: { _id: JSON.parse(localStorage.getItem('user')).id, name: JSON.parse(localStorage.getItem('user')).name }}]);
        // Remove from available groups
        setAvailableGroups(availableGroups.filter(g => g._id !== groupId));
      }
      
      toast.success('Successfully became a mentor for this group!');
    } catch (err) {
      console.error('Error becoming mentor:', err);
      toast.error('Failed to become a mentor. Please try again.');
    }
  };

  const handleStopMentoring = async (groupId) => {
    try {
      await axios.post(`${API_URL}/api/groups/${groupId}/mentor/unassign`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the lists
      const unmentoredGroup = mentoredGroups.find(g => g._id === groupId);
      if (unmentoredGroup) {
        // Remove mentor info
        const updatedGroup = {...unmentoredGroup, mentor: null};
        // Move to available groups
        setAvailableGroups([...availableGroups, updatedGroup]);
        // Remove from mentored groups
        setMentoredGroups(mentoredGroups.filter(g => g._id !== groupId));
      }
      
      toast.success('Successfully stopped mentoring this group.');
    } catch (err) {
      console.error('Error stopping mentoring:', err);
      toast.error('Failed to stop mentoring. Please try again.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="teacher">
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Group Mentoring</h1>
        
        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow-md">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('available-groups')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'available-groups'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Available Groups
              </button>
              <button
                onClick={() => setActiveTab('mentored-groups')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'mentored-groups'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Mentored Groups
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-md p-6">
          {activeTab === 'available-groups' && (
            <>
              {availableGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableGroups.map(group => (
                    <div key={group._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                      <p className="text-gray-600 mt-1">{group.description}</p>
                      <div className="flex items-center mt-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {group.subject}
                        </span>
                        <span className="ml-2 text-gray-500 text-sm">
                          {group.members.length}/{group.maxMembers} members
                        </span>
                      </div>
                      <button
                        onClick={() => handleBecomeMentor(group._id)}
                        className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Become Mentor
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No available groups for mentoring at the moment.</p>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'mentored-groups' && (
            <>
              {mentoredGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mentoredGroups.map(group => (
                    <div key={group._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                      <p className="text-gray-600 mt-1">{group.description}</p>
                      <div className="flex items-center mt-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {group.subject}
                        </span>
                        <span className="ml-2 text-gray-500 text-sm">
                          {group.members.length}/{group.maxMembers} members
                        </span>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-green-600">You are mentoring this group</span>
                        <button
                          onClick={() => handleStopMentoring(group._id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                        >
                          Stop Mentoring
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">You are not mentoring any groups yet.</p>
                  <button
                    onClick={() => setActiveTab('available-groups')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Find Groups to Mentor
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GroupMentoring; 