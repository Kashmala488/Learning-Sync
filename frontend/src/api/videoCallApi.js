import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_VIDEO_API_URL || 'http://localhost:5000',
});

export const createVideoCall = async (groupId, token) => {
  try {
    const response = await api.post('/api/video-call/create', { groupId }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response;
  } catch (error) {
    console.error('Create video call error:', error.response?.data || error.message);
    throw error;
  }
};

export const getVideoCallRoom = async (groupId, token) => {
  try {
    const response = await api.get(`/api/video-call/room/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response;
  } catch (error) {
    console.error('Get video call room error:', error.response?.data || error.message);
    throw error;
  }
};

export const checkCallStatus = async (groupId, token) => {
  try {
    const response = await api.get(`/api/video-call/status/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response;
  } catch (error) {
    console.error('Check call status error:', error.response?.data || error.message);
    throw error;
  }
};

export const endVideoCall = async (groupId, token) => {
  try {
    const response = await api.post(`/api/video-call/end/${groupId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response;
  } catch (error) {
    console.error('End video call error:', error.response?.data || error.message);
    throw error;
  }
};