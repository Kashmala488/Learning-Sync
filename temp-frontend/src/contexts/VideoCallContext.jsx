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
    loading: false
  });

  const initializeVideoCall = useCallback(async (groupId, token) => {
    if (!groupId || !token) {
      throw new Error('GroupId and token are required');
    }

    setCallState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await axios.post(
        'http://localhost:5000/api/video-call/create',
        { groupId },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data || !response.data.roomName) {
        throw new Error('Invalid response from server');
      }

      setCallState({
        inCall: true,
        roomId: response.data.roomName,
        groupId,
        error: null,
        loading: false
      });

      return response.data.roomName;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to initialize video call';
      console.error('Error initializing video call:', errorMessage);
      
      setCallState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      
      throw new Error(errorMessage);
    }
  }, []);

  const endVideoCall = useCallback(() => {
    setCallState({
      inCall: false,
      roomId: null,
      groupId: null,
      error: null,
      loading: false
    });
  }, []);

  const value = React.useMemo(() => ({
    callState,
    initializeVideoCall,
    endVideoCall
  }), [callState, initializeVideoCall, endVideoCall]);

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider> // Corrected closing tag
  );
};

export default VideoCallProvider;