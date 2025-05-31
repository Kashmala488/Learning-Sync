import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const VideoCallContext = createContext(null);

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};

export const VideoCallProvider = ({ children }) => {
  const [callState, setCallState] = useState({
    inCall: false,
    roomId: null,
    groupId: null,
    error: null,
    loading: false,
    participants: []
  });

  const API_URL = process.env.REACT_APP_VIDEO_API_URL || 'http://localhost:5000';

  const initializeVideoCall = useCallback(async (groupId, token) => {
    if (!groupId || !token) {
      throw new Error('GroupId and token are required');
    }

    setCallState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.post(
        `${API_URL}/api/video-call/create`,
        { 
          groupId,
          userId: JSON.parse(localStorage.getItem('user'))._id,
          dbType: 'mysql' // Specify database type
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.roomId) {
        throw new Error('Invalid response from server');
      }

      setCallState(prev => ({
        ...prev,
        inCall: true,
        roomId: response.data.roomId,
        groupId,
        loading: false,
        error: null
      }));

      return response.data.roomId;

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      console.error('Video call initialization error:', errorMessage);
      
      setCallState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));

      throw new Error(errorMessage);
    }
  }, [API_URL]);

  const updateParticipants = useCallback((participants) => {
    setCallState(prev => ({
      ...prev,
      participants
    }));
  }, []);

  const endVideoCall = useCallback(() => {
    setCallState({
      inCall: false,
      roomId: null,
      groupId: null,
      error: null,
      loading: false,
      participants: []
    });
  }, []);

  const value = React.useMemo(
    () => ({
      callState,
      initializeVideoCall,
      endVideoCall,
      updateParticipants
    }),
    [callState, initializeVideoCall, endVideoCall, updateParticipants]
  );

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
};

export default VideoCallProvider;