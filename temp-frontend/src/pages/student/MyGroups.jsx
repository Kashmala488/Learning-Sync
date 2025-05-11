import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faUser, faUserFriends, faQuestionCircle, faVideo } from '@fortawesome/free-solid-svg-icons';
import { useVideoCall } from '../../contexts/VideoCallContext';

const API_URL = 'http://localhost:4000';
const VIDEO_API_URL = 'http://localhost:5000';

// Video call API functions
const createVideoCall = async (groupId, token) => {
    return await axios.post(
        `${VIDEO_API_URL}/api/video-call/create`,
        { groupId },
        { headers: { Authorization: `Bearer ${token}` } }
    );
};

const checkCallStatus = async (groupId, token) => {
    return await axios.get(
        `${VIDEO_API_URL}/api/video-call/status/${groupId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
};

const MyGroups = () => {
    const { token, currentUser } = useAuth();
    const navigate = useNavigate();
    const [myGroups, setMyGroups] = useState([]);
    const [availableGroups, setAvailableGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('my-groups');
    const { initializeVideoCall } = useVideoCall();
    const [callStatus, setCallStatus] = useState({});

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const userString = localStorage.getItem('user');
                const user = userString ? JSON.parse(userString) : null;
                const currentUserId = user?._id || user?.id;

                if (!token) throw new Error('Missing token');
                if (!currentUserId) throw new Error('Missing user ID');

                const response = await axios.get(`${API_URL}/api/groups`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyGroups(response.data || []);

                const availableResponse = await axios.get(`${API_URL}/api/groups/recommendations/find`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAvailableGroups(availableResponse.data || []);

                // Check call status for each group
                const statusPromises = response.data.map(async (group) => {
                    try {
                        const statusResponse = await checkCallStatus(group._id, token);
                        return { groupId: group._id, status: statusResponse.data };
                    } catch (error) {
                        console.error(`Error checking call status for group ${group._id}:`, error);
                        return { groupId: group._id, status: { active: false } };
                    }
                });
                
                const statuses = await Promise.all(statusPromises);
                const statusMap = statuses.reduce((acc, { groupId, status }) => {
                    acc[groupId] = status;
                    return acc;
                }, {});
                setCallStatus(statusMap);

                setLoading(false);
            } catch (err) {
                console.error('[fetchGroups] Error fetching groups:', err);
                setError('Failed to load groups. Please try again later.');
                setLoading(false);
            }
        };

        if (token) fetchGroups();
    }, [token]);

    const handleJoinGroup = async (groupId) => {
        try {
            await axios.post(`${API_URL}/api/groups/${groupId}/join`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const joinedGroup = availableGroups.find(g => g._id === groupId);
            if (joinedGroup) {
                setAvailableGroups(availableGroups.filter(g => g._id !== groupId));
                setMyGroups([...myGroups, joinedGroup]);
            }

            toast.success('Successfully joined the group!');
        } catch (err) {
            console.error('Error joining group:', err);
            toast.error('Failed to join group. Please try again.');
        }
    };

    const handleLeaveGroup = async (groupId) => {
        try {
            await axios.post(`${API_URL}/api/groups/${groupId}/leave`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const leftGroup = myGroups.find(g => g._id === groupId);
            if (leftGroup) {
                setMyGroups(myGroups.filter(g => g._id !== groupId));
                setAvailableGroups([...availableGroups, leftGroup]);
            }

            toast.success('Successfully left the group.');
        } catch (err) {
            console.error('Error leaving group:', err);
            toast.error('Failed to leave group. Please try again.');
        }
    };

    const openGroupChat = (group) => {
        navigate(`/group-chat/${group._id}`);
    };

    const startVideoCall = async (group) => {
        try {
            if (!token) {
                toast.error('Please login again to start a video call');
                navigate('/login');
                return;
            }

            if (!group._id) {
                toast.error('Invalid group information');
                return;
            }

            // Check if there's an active call for this group
            const status = callStatus[group._id];
            if (status?.active) {
                // Join existing call
                navigate(`/groups/${group._id}/video-call`, {
                    state: {
                        groupId: group._id,
                        groupName: group.name,
                        roomId: status.roomId,
                    },
                });
                return;
            }

            // Use existing initializeVideoCall if available, otherwise use direct API call
            let roomId;
            if (typeof initializeVideoCall === 'function') {
                roomId = await initializeVideoCall(group._id, token);
            } else {
                const response = await createVideoCall(group._id, token);
                roomId = response.data.roomId;
            }

            try {
                const notifyResponse = await axios.post(
                    `${VIDEO_API_URL}/api/video-call/notify`,
                    {
                        groupId: group._id,
                        roomName: roomId,
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                console.log('Notifications sent:', notifyResponse.data);
                toast.success('Group members notified!');
            } catch (err) {
                console.error('Failed to send notifications:', err.response?.data || err.message);
                toast.warn('Video call started, but some members may not be notified');
            }

            navigate(`/groups/${group._id}/video-call`, {
                state: {
                    groupId: group._id,
                    groupName: group.name,
                    roomId: roomId,
                },
            });
        } catch (err) {
            console.error('Failed to start video call:', err);
            let errorMessage = 'Failed to start video call';
            if (err.message.includes('Network Error') || err.message.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Cannot connect to video call server. Please ensure the server is running.';
            } else if (err.message.includes('Authentication failed')) {
                errorMessage = 'Authentication failed. Please log in again.';
                navigate('/login');
            } else if (err.message.includes('not authorized')) {
                errorMessage = 'You are not authorized to start this video call.';
            } else if (err.message.includes('Group not found')) {
                errorMessage = 'Group not found.';
            }
            toast.error(errorMessage);
        }
    };

    const handleTakeQuiz = (groupId) => {
        console.log(`Taking quiz for group: ${groupId}`);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center min-h-screen">
                    <LoadingSpinner />
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
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
        <DashboardLayout>
            <div className="container mx-auto px-4 max-w-5xl">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">My Learning Groups</h1>

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
                                onClick={() => setActiveTab('available-groups')}
                                className={`px-6 py-4 text-sm font-medium ${
                                    activeTab === 'available-groups'
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Available Groups
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-b-lg shadow-md p-6">
                    {activeTab === 'my-groups' && (
                        <>
                            {myGroups.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myGroups.map(group => (
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
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => openGroupChat(group)}
                                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                                                >
                                                    <FontAwesomeIcon icon={faComments} className="mr-1" />
                                                    Group Chat
                                                </button>
                                                <button
                                                    onClick={() => startVideoCall(group)}
                                                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
                                                >
                                                    <FontAwesomeIcon icon={faVideo} className="mr-1" />
                                                    {callStatus[group._id]?.active ? 'Join Video Call' : 'Start Video Call'}
                                                </button>
                                                {group.mentor && (
                                                    <Link
                                                        to="/student/communication"
                                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                                    >
                                                        <FontAwesomeIcon icon={faUser} className="mr-1" />
                                                        Message Mentor
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => handleTakeQuiz(group._id)}
                                                    className="text-blue-600 hover:text-blue-800 flex items-center"
                                                >
                                                    <FontAwesomeIcon icon={faQuestionCircle} className="mr-1" />
                                                    Take Quiz
                                                </button>
                                                <button
                                                    onClick={() => handleLeaveGroup(group._id)}
                                                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                                                >
                                                    Leave Group
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">You haven't joined any groups yet.</p>
                                    <button
                                        onClick={() => setActiveTab('available-groups')}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Browse Available Groups
                                    </button>
                                </div>
                            )}
                        </>
                    )}

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
                                            {group.mentor && (
                                                <div className="mt-2">
                                                    <span className="text-sm text-gray-600">
                                                        <span className="font-medium">Mentor:</span> {group.mentor.name || 'Teacher'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="mt-4">
                                                <button
                                                    onClick={() => handleJoinGroup(group._id)}
                                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                                >
                                                    <FontAwesomeIcon icon={faUserFriends} className="mr-1" />
                                                    Join Group
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">No available groups to join.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default MyGroups;