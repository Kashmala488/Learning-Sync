import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

// API base URL
const API_URL = 'http://localhost:4000';

const CollaborationHub = () => {
  const { userRole } = useAuth();
  const [groups, setGroups] = useState([]);
  const [recommendedGroups, setRecommendedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subject: '',
    maxMembers: 5
  });
  const [activeTab, setActiveTab] = useState('my-groups');
  const [messages, setMessages] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        // Fetch user's groups
        const groupsResponse = await axios.get(`${API_URL}/api/groups`, config);
        setGroups(groupsResponse.data);

        // Fetch recommended groups
        const recommendedResponse = await axios.get(`${API_URL}/api/groups/recommendations/find`, config);
        setRecommendedGroups(recommendedResponse.data);
      } catch (err) {
        console.error('Error fetching collaboration data:', err);
        setError('Failed to load collaboration data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchGroupMessages = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const response = await axios.get(`${API_URL}/api/groups/${groupId}/messages`, config);
      setMessages(response.data);
      setCurrentGroupId(groupId);
    } catch (err) {
      console.error('Error fetching group messages:', err);
      toast.error('Failed to load messages. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGroup({ ...newGroup, [name]: value });
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const response = await axios.post(`${API_URL}/api/groups/create`, newGroup, config);
      setGroups([...groups, response.data]);
      setNewGroup({
        name: '',
        description: '',
        subject: '',
        maxMembers: 5
      });
      setShowCreateModal(false);
      toast.success('Group created successfully!');
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Failed to create group. Please try again.');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      await axios.post(`${API_URL}/api/groups/${groupId}/join`, {}, config);
      setRecommendedGroups(recommendedGroups.filter(group => group._id !== groupId));
      const groupsResponse = await axios.get(`${API_URL}/api/groups`, config);
      setGroups(groupsResponse.data);
      toast.success('You have joined the group!');
    } catch (err) {
      console.error('Error joining group:', err);
      toast.error('Failed to join group. Please try again.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !currentGroupId) return;

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const response = await axios.post(
        `${API_URL}/api/groups/${currentGroupId}/messages`,
        { content: messageText },
        config
      );
      setMessages([...messages, response.data]);
      setMessageText('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message. Please try again.');
    }
  };

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
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={userRole || 'student'}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Collaboration Hub</h2>
        <p className="text-gray-600">Connect with peers, join groups, and collaborate on learning</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-t-lg shadow-md">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'my-groups'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Groups
            </button>
            <button
              onClick={() => setActiveTab('find-groups')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'find-groups'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Find Groups
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg shadow-md p-6">
        {/* My Groups */}
        {activeTab === 'my-groups' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Your Groups</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create New Group
              </button>
            </div>

            {groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(group => (
                  <div key={group._id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <h4 className="text-lg font-semibold text-gray-800">{group.name}</h4>
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
                      onClick={() => fetchGroupMessages(group._id)}
                      className="mt-3 px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      View Messages
                    </button>
                    <Link
                      to={`/quizzes/practice?groupId=${group._id}&subject=${encodeURIComponent(group.subject || '')}`}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <FontAwesomeIcon icon={faQuestionCircle} className="mr-1" />
                      Take Quiz
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">You haven't joined any groups yet.</p>
                <button
                  onClick={() => setActiveTab('find-groups')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Find Groups to Join
                </button>
              </div>
            )}

            {/* Messages Section */}
            {currentGroupId && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Group Messages</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  {messages.length > 0 ? (
                    messages.map(message => (
                      <div key={message._id} className="mb-4">
                        <div className="flex items-start">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">
                            {message.sender.name[0]}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-800">
                              {message.sender.name}
                              <span className="text-xs text-gray-500 ml-2">
                                {new Date(message.createdAt).toLocaleString()}
                              </span>
                            </p>
                            <p className="text-sm text-gray-700">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-sm">No messages in this group yet.</p>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="mt-4 flex">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Find Groups */}
        {activeTab === 'find-groups' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Recommended Groups</h3>
            {recommendedGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedGroups.map(group => (
                  <div key={group._id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <h4 className="text-lg font-semibold text-gray-800">{group.name}</h4>
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
                      onClick={() => handleJoinGroup(group._id)}
                      className="mt-3 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={group.members.length >= group.maxMembers}
                    >
                      {group.members.length >= group.maxMembers ? 'Group Full' : 'Join Group'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No recommended groups available at the moment.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Your Own Group
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Group Name</label>
                <input
                  type="text"
                  name="name"
                  value={newGroup.name}
                  onChange={handleInputChange}
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={newGroup.description}
                  onChange={handleInputChange}
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={newGroup.subject}
                  onChange={handleInputChange}
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Max Members</label>
                <input
                  type="number"
                  name="maxMembers"
                  value={newGroup.maxMembers}
                  onChange={handleInputChange}
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="2"
                  max="20"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CollaborationHub;