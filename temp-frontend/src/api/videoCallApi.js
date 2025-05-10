import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:4000/api/video-call',
});

export const createVideoCall = (groupId, token) =>
    api.post('/create', { groupId }, { headers: { Authorization: `Bearer ${token}` } });

export const getVideoCallRoom = (groupId, token) =>
    api.get(`/room/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });