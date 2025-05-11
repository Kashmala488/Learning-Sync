import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useVideoCall } from '../../contexts/VideoCallContext';
import { toast } from 'react-toastify';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
  faVideo,
  faVideoSlash,
  faDesktop,
  faComments,
  faSignOutAlt,
  faUser,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { createVideoCall, getVideoCallRoom, checkCallStatus, endVideoCall } from '../../api/videoCallApi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

// Initialize Socket.IO client
const socket = io(SOCKET_URL, {
  auth: { token: null },
  transports: ['websocket', 'polling'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000, // Add timeout
});

const playVideo = async (videoElement, stream) => {
  if (!videoElement || !stream) return;
  
  try {
    videoElement.srcObject = stream;
    // Check if element is still in DOM before playing
    if (document.body.contains(videoElement)) {
      await videoElement.play();
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Video play error:', err);
    }
  }
};

const VideoStreamComponent = ({ stream, isVideoOn, name, isSharingScreen }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (stream && videoRef.current && isVideoOn) {
      playVideo(videoRef.current, stream);
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, isVideoOn]);
  
  if (!stream || !isVideoOn) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <FontAwesomeIcon icon={faUser} className="text-4xl" />
      </div>
    );
  }
  
  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSharingScreen}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded">
        {name} {isSharingScreen ? '(Screen)' : ''}
      </div>
    </>
  );
};

const VideoCall = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, currentUser, refreshToken } = useAuth();
  const { endVideoCall: contextEndVideoCall } = useVideoCall();
  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [file, setFile] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const videoRef = useRef(null);
  const screenShareRef = useRef(null);
  const peersRef = useRef([]);
  const chatRef = useRef(null);
  const isMounted = useRef(true);
  const isInitializing = useRef(false);
  const socketConnected = useRef(false);

  // Memoize groupId, roomId, and token
  const groupId = useMemo(() => location.state?.groupId, [location.state?.groupId]);
  const groupName = useMemo(
    () => location.state?.groupName || 'Video Call',
    [location.state?.groupName]
  );
  const roomId = useMemo(
    () => location.state?.roomId || `room-${groupId}`,
    [location.state?.roomId, groupId]
  );
  const memoizedToken = useMemo(() => token, [token]);

  const checkPermissions = useCallback(async () => {
    try {
      const [camera, microphone] = await Promise.all([
        navigator.permissions.query({ name: 'camera' }),
        navigator.permissions.query({ name: 'microphone' }),
      ]);
      if (camera.state === 'denied' || microphone.state === 'denied') {
        setShowPermissionModal(true);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Permission check error:', err);
      return false;
    }
  }, []);

  const validateToken = useCallback(async () => {
    if (!memoizedToken) {
      console.warn('No token available for WebSocket connection');
      return false;
    }
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${memoizedToken}` },
      });
      if (!response.ok) {
        throw new Error(`Token validation failed: ${response.status}`);
      }
      console.log('Token validated for WebSocket:', memoizedToken.slice(0, 10) + '...');
      return true;
    } catch (error) {
      console.error('Token validation error:', error.message);
      return false;
    }
  }, [memoizedToken]);

  const initializeVideoCall = useCallback(async () => {
    if (isInitializing.current || socketConnected.current) {
      console.log('initializeVideoCall already running or socket connected, skipping');
      return;
    }
    isInitializing.current = true;
    setConnectionError(null);

    try {
      console.log('Initializing video call:', { token: !!memoizedToken, groupId, roomId });
      if (!memoizedToken || !groupId || !roomId) {
        throw new Error(
          `Missing parameters: token=${!!memoizedToken}, groupId=${groupId}, roomId=${roomId}`
        );
      }

      // Check call status
      let callRoomId = roomId;
      try {
        const statusResponse = await checkCallStatus(groupId, memoizedToken);
        if (!statusResponse.data.active) {
          toast.error('The call has ended.');
          navigate('/my-groups');
          return;
        }
        callRoomId = statusResponse.data.roomId;
      } catch (error) {
        console.error('Call status check failed:', error);
        try {
          const roomResponse = await getVideoCallRoom(groupId, memoizedToken);
          callRoomId = roomResponse.data.roomId;
        } catch (roomError) {
          console.error('Failed to get video call room:', roomError);
          throw new Error('Failed to initialize video call');
        }
      }

      const isTokenValid = await validateToken();
      if (!isTokenValid) {
        console.warn('Invalid token, attempting refresh');
        const refreshed = await refreshToken();
        if (!refreshed) {
          throw new Error('Token refresh failed');
        }
      }

      const hasPermissions = await checkPermissions();
      let userStream = null;
      if (hasPermissions) {
        try {
          userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setStream(userStream);
          setIsMicOn(true);
          setIsCameraOn(true);
          if (videoRef.current) {
            playVideo(videoRef.current, userStream);
          }
          socket.emit('toggle-video', { roomId: callRoomId, isVideoOn: true });
        } catch (err) {
          console.warn('Media permissions denied:', err.message);
          setShowPermissionModal(true);
          setIsMicOn(false);
          setIsCameraOn(false);
          toast.warn('Camera/microphone permissions denied. Joining call without media.');
          socket.emit('toggle-video', { roomId: callRoomId, isVideoOn: false });
        }
      } else {
        setIsMicOn(false);
        setIsCameraOn(false);
        socket.emit('toggle-video', { roomId: callRoomId, isVideoOn: false });
      }

      if (!socket.connected) {
        socket.auth = { token: memoizedToken, roomId: callRoomId };
        console.log('Setting socket.auth:', {
          token: memoizedToken.slice(0, 10) + '...',
          roomId: callRoomId,
        });
        console.log('Socket.IO connecting...');
        socket.connect();
      }

      // Fetch notifications
      try {
        const response = await fetch(`${API_URL}/api/students/notifications`, {
          headers: { Authorization: `Bearer ${memoizedToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    } catch (err) {
      console.error('Video call initialization error:', err);
      if (isMounted.current) {
        setConnectionError(`Failed to start video call: ${err.message}`);
        toast.error(`Failed to start video call: ${err.message}`);
        navigate('/my-groups');
      }
    } finally {
      isInitializing.current = false;
    }
  }, [
    memoizedToken,
    groupId,
    roomId,
    navigate,
    checkPermissions,
    validateToken,
    refreshToken,
  ]);

  const setupSocketListeners = useCallback(() => {
    socket.on('connect', () => {
      console.log('Socket.IO connected');
      socketConnected.current = true;
      setConnectionError(null);
      socket.emit(
        'join-room',
        { roomId, groupId, userId: currentUser._id, email: currentUser.email, name: currentUser.name },
        ({ error, participants }) => {
          if (error) {
            console.error('Join-room error:', error);
            toast.error(`Failed to join room: ${error}`);
            if (isMounted.current) {
              navigate('/my-groups');
            }
            return;
          }
          console.log('Join-room success:', { participants });
          if (isMounted.current) {
            setParticipants(participants);
          }
        }
      );
    });

    socket.on('connect_error', async (err) => {
      console.error('Socket.IO connect_error:', {
        message: err.message,
        description: err.description,
        context: err.context,
        statusCode: err.statusCode,
      });
      socketConnected.current = false;
      if (isMounted.current) {
        setConnectionError(`Connection error: ${err.message}`);
        toast.error(`Failed to connect to video call server: ${err.message}`);
        if (err.message.includes('Authentication error')) {
          console.warn('Authentication error, attempting token refresh');
          const refreshed = await refreshToken();
          if (refreshed) {
            socket.auth = { token: memoizedToken, roomId };
            socket.connect();
          } else {
            toast.error('Authentication failed, please log in again');
            navigate('/login');
          }
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      socketConnected.current = false;
      if (isMounted.current) {
        setConnectionError(`Disconnected: ${reason}`);
        toast.warn(`Disconnected from video call: ${reason}`);
      }
    });

    socket.on('error', (err) => {
      console.error('Socket.IO error:', err);
      if (isMounted.current) {
        setConnectionError(`Video call error: ${err.message || 'Unknown error'}`);
        toast.error(`Video call error: ${err.message || 'Unknown error'}`);
      }
    });

    socket.on('signal', ({ from, signal, initiator }) => {
      console.log('Received signal:', { from, initiator });
      if (!isMounted.current) return;
      const peer = peersRef.current.find((p) => p.socketId === from);
      if (peer) {
        peer.peer.signal(signal);
      } else {
        const newPeer = new Peer({ initiator: !initiator, trickle: false, stream });
        newPeer.on('signal', (data) => {
          socket.emit('signal', { to: from, signal: data, initiator: !initiator });
        });
        newPeer.on('stream', (peerStream) => {
          if (isMounted.current) {
            setPeers((prev) => [
              ...prev.filter((p) => p.socketId !== from),
              { socketId: from, stream: peerStream, peer: newPeer },
            ]);
          }
        });
        newPeer.signal(signal);
        peersRef.current.push({ socketId: from, peer: newPeer });
      }
    });

    socket.on('participants-updated', (updatedParticipants) => {
      console.log('Participants updated:', updatedParticipants);
      if (isMounted.current) {
        setParticipants(updatedParticipants);
        updatedParticipants.forEach((participant) => {
          if (
            participant.socketId !== socket.id &&
            !peersRef.current.find((p) => p.socketId === participant.socketId) &&
            stream
          ) {
            const newPeer = new Peer({ initiator: true, trickle: false, stream });
            newPeer.on('signal', (data) => {
              socket.emit('signal', {
                to: participant.socketId,
                signal: data,
                initiator: true,
              });
            });
            newPeer.on('stream', (peerStream) => {
              if (isMounted.current) {
                setPeers((prev) => [
                  ...prev.filter((p) => p.socketId !== participant.socketId),
                  { socketId: participant.socketId, stream: peerStream, peer: newPeer },
                ]);
              }
            });
            peersRef.current.push({ socketId: participant.socketId, peer: newPeer });
          }
        });
      }
    });

    socket.on('user-left', ({ userId }) => {
      console.log('User left:', { userId });
      if (isMounted.current) {
        const socketId = participants.find((p) => p.id === userId)?.socketId;
        setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
        peersRef.current = peersRef.current.filter((p) => p.socketId !== socketId);
      }
    });

    socket.on('group-message', (message) => {
      console.log('Group message:', message);
      if (isMounted.current) {
        setMessages((prev) => [...prev, message]);
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }
    });

    socket.on('private-message', ({ from, message }) => {
      console.log('Private message:', { from, message });
      if (isMounted.current) {
        setPrivateMessages((prev) => ({
          ...prev,
          [message.senderId]: [...(prev[message.senderId] || []), message],
        }));
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }
    });

    socket.on('user-muted', ({ userId }) => {
      console.log('User muted:', { userId });
      if (isMounted.current && userId === currentUser._id) {
        setIsMicOn(false);
        if (stream) {
          stream.getAudioTracks().forEach((track) => (track.enabled = false));
        }
        toast.info('You have been muted by the moderator');
      }
    });

    socket.on('user-unmuted', ({ userId }) => {
      console.log('User unmuted:', { userId });
      if (isMounted.current && userId === currentUser._id) {
        setIsMicOn(true);
        if (stream) {
          stream.getAudioTracks().forEach((track) => (track.enabled = true));
        }
        toast.info('You have been unmuted by the moderator');
      }
    });

    socket.on('screen-sharing', ({ userId, isSharing }) => {
      console.log('Screen sharing update:', { userId, isSharing });
      if (isMounted.current) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, isSharingScreen: isSharing } : p))
        );
        if (isSharing) {
          const peer = peersRef.current.find(
            (p) => p.socketId === participants.find((part) => part.id === userId)?.socketId
          );
          if (peer && screenShareRef.current) {
            peer.peer.on('stream', (remoteStream) => {
              playVideo(screenShareRef.current, remoteStream);
            });
          }
        } else {
          if (screenShareRef.current) {
            screenShareRef.current.srcObject = null;
          }
        }
      }
    });

    socket.on('call-ended', () => {
      console.log('Call ended');
      if (isMounted.current) {
        toast.info('The video call has ended');
        cleanup();
        navigate('/my-groups');
      }
    });
  }, [stream, groupId, roomId, currentUser._id, currentUser.email, currentUser.name, navigate, memoizedToken, refreshToken]);

  const cleanup = useCallback(() => {
    isMounted.current = false;
    
    // Clean up main video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Clean up screen share
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }
    
    // Stop all tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    
    // Clean up peer connections
    peersRef.current.forEach((p) => {
      if (p.peer) {
        p.peer.destroy();
      }
    });
    peersRef.current = [];
    setPeers([]);
    
    socket.disconnect();
  }, [stream]);

  useEffect(() => {
    isMounted.current = true;
    if (memoizedToken && groupId && roomId) {
      initializeVideoCall();
      setupSocketListeners();
    } else {
      console.warn('Missing required parameters for video call:', {
        token: !!memoizedToken,
        groupId,
        roomId,
      });
      toast.error('Unable to start video call: Missing parameters');
      navigate('/my-groups');
    }

    return cleanup;
  }, [memoizedToken, groupId, roomId, initializeVideoCall, setupSocketListeners, cleanup, navigate]);

  useEffect(() => {
    if (stream && videoRef.current && (isCameraOn || isSharingScreen)) {
      playVideo(videoRef.current, stream);
    }
  }, [stream, isCameraOn, isSharingScreen]);

  const toggleMic = async () => {
    if (!stream) {
      const hasPermissions = await checkPermissions();
      if (hasPermissions) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setStream(newStream);
          setIsMicOn(true);
          setShowPermissionModal(false);
        } catch (err) {
          setShowPermissionModal(true);
          toast.error('Failed to access microphone');
        }
      }
    } else {
      stream.getAudioTracks().forEach((track) => (track.enabled = !isMicOn));
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = async () => {
    if (!stream) {
      const hasPermissions = await checkPermissions();
      if (hasPermissions) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(newStream);
          setIsCameraOn(true);
          setShowPermissionModal(false);
          socket.emit('toggle-video', { roomId, isVideoOn: true });
          if (videoRef.current) {
            playVideo(videoRef.current, newStream);
          }
        } catch (err) {
          setShowPermissionModal(true);
          toast.error('Failed to access camera');
        }
      }
    } else {
      stream.getVideoTracks().forEach((track) => (track.enabled = !isCameraOn));
      setIsCameraOn(!isCameraOn);
      socket.emit('toggle-video', { roomId, isVideoOn: !isCameraOn });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isSharingScreen) {
        stream.getVideoTracks().forEach((track) => track.stop());
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        if (videoRef.current) {
          playVideo(videoRef.current, userStream);
        }
        peersRef.current.forEach((p) => {
          const videoTrack = userStream.getVideoTracks()[0];
          p.peer.replaceTrack(stream.getVideoTracks()[0], videoTrack, userStream);
        });
        socket.emit('screen-sharing', { roomId, isSharing: false });
        setIsSharingScreen(false);
        setIsCameraOn(true);
        socket.emit('toggle-video', { roomId, isVideoOn: true });
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = null;
        }
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setStream(screenStream);
        if (videoRef.current) {
          playVideo(videoRef.current, screenStream);
        }
        peersRef.current.forEach((p) => {
          const videoTrack = screenStream.getVideoTracks()[0];
          p.peer.replaceTrack(stream.getVideoTracks()[0], videoTrack, screenStream);
        });
        screenStream.getVideoTracks()[0].onended = () => toggleScreenShare();
        socket.emit('screen-sharing', { roomId, isSharing: true });
        setIsSharingScreen(true);
        setIsCameraOn(false);
        socket.emit('toggle-video', { roomId, isVideoOn: false });
      }
    } catch (err) {
      console.error('Screen sharing error:', err);
      toast.error('Failed to share screen: ' + err.message);
    }
  };

  const muteUser = (userId) => {
    socket.emit('mute-user', { roomId, userId });
  };

  const unmuteUser = (userId) => {
    socket.emit('unmute-user', { roomId, userId });
  };

  const sendMessage = () => {
    if (!messageInput.trim() && !file) return;

    const messageData = { roomId };
    if (messageInput.trim()) {
      messageData.content = messageInput;
    }
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        messageData.file = {
          name: file.name,
          type: file.type,
          data: reader.result,
        };
        if (selectedUser) {
          socket.emit('private-message', {
            roomId,
            to: participants.find((p) => p.id === selectedUser).socketId,
            ...messageData,
          });
        } else {
          socket.emit('group-message', messageData);
        }
        setMessageInput('');
        setFile(null);
      };
      reader.readAsDataURL(file);
    } else {
      if (selectedUser) {
        socket.emit('private-message', {
          roomId,
          to: participants.find((p) => p.id === selectedUser).socketId,
          ...messageData,
        });
      } else {
        socket.emit('group-message', messageData);
      }
      setMessageInput('');
    }
  };

  const endCall = async () => {
    try {
      await endVideoCall(groupId, memoizedToken);
      socket.emit('call-ended', { groupId });
      cleanup();
      navigate('/my-groups');
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call');
    }
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      const response = await checkCallStatus(groupId, memoizedToken);
      if (response.data.active) {
        navigate(`/video-call/${groupId}`, {
          state: { groupId, groupName, roomId: response.data.roomId },
        });
      } else {
        toast.info('The call has ended.');
      }
      await fetch(`${API_URL}/api/students/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${memoizedToken}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error('Error handling notification:', error);
      toast.error('Failed to process notification');
    }
  };

  const closeNotifications = () => {
    setNotifications([]);
  };

  const PermissionModal = ({ onClose, onRetry }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Camera/Microphone Access Required</h2>
        <p className="mb-4">
          Please allow camera and microphone access in your browser settings to join the video call.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  const handlePeerStream = useCallback((video, peerStream) => {
    if (!video || !peerStream) return;
    
    playVideo(video, peerStream);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">{groupName}</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 p-4 ${isChatOpen ? 'mr-[400px]' : ''}`}>
          {connectionError && (
            <div className="bg-red-600 text-white p-4 rounded-lg mb-4">Error: {connectionError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[300px]">
            <div className="relative bg-black rounded-lg shadow-lg overflow-hidden">
              <VideoStreamComponent
                stream={stream}
                isVideoOn={isCameraOn || isSharingScreen}
                name={currentUser.name}
                isSharingScreen={isSharingScreen}
              />
            </div>
            {peers.map((peer, index) => {
              const participant = participants.find((p) => p.socketId === peer.socketId);
              return (
                <div
                  key={index}
                  className="relative bg-black rounded-lg shadow-lg overflow-hidden"
                >
                  <VideoStreamComponent
                    stream={peer.stream}
                    isVideoOn={participant?.isVideoOn}
                    name={participant?.name || 'Unknown'}
                    isSharingScreen={participant?.isSharingScreen}
                  />
                </div>
              );
            })}
            {participants.some((p) => p.isSharingScreen) && (
              <div className="relative bg-black rounded-lg shadow-lg overflow-hidden">
                <video
                  ref={screenShareRef}
                  autoPlay
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded">
                  Screen Share
                </div>
              </div>
            )}
          </div>
        </div>
        {isChatOpen && (
          <div className="w-[400px] bg-gray-800 shadow-lg flex flex-col transition-all duration-300">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Chat</h2>
              <select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value || null)}
                className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1"
              >
                <option value="">Group Chat</option>
                {participants
                  .filter((p) => p.id !== currentUser._id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div ref={chatRef} className="flex-1 p-4 overflow-y-auto">
              {(selectedUser ? privateMessages[selectedUser] || [] : messages).map((msg, index) => (
                <div
                  key={index}
                  className={`mb-4 ${msg.senderId === currentUser._id ? 'text-right' : ''}`}
                >
                  <p className="text-sm text-gray-400">
                    {msg.senderName} - {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                  {msg.content && (
                    <p
                      className={`inline-block p-2 rounded-lg ${
                        msg.senderId === currentUser._id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      {msg.content}
                    </p>
                  )}
                  {msg.file && (
                    <div>
                      {msg.file.type.startsWith('image/') ? (
                        <img src={msg.file.data} alt={msg.file.name} className="max-w-xs rounded" />
                      ) : (
                        <a
                          href={msg.file.data}
                          download={msg.file.name}
                          className="text-blue-400 hover:underline"
                        >
                          {msg.file.name}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
                }
                placeholder="Type a message..."
                className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2 mb-2"
              />
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="mb-2 text-white"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="bg-gray-800 shadow p-4 flex justify-center space-x-4">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full ${
            isMicOn ? 'bg-blue-600' : 'bg-red-600'
          } text-white hover:shadow-lg transition relative group`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          <FontAwesomeIcon icon={isMicOn ? faMicrophone : faMicrophoneSlash} />
          <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 -top-8">
            Microphone
          </span>
        </button>
        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full ${
            isCameraOn ? 'bg-blue-600' : 'bg-red-600'
          } text-white hover:shadow-lg transition relative group`}
          title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          <FontAwesomeIcon icon={isCameraOn ? faVideo : faVideoSlash} />
          <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 -top-8">
            Camera
          </span>
        </button>
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full ${
            isSharingScreen ? 'bg-green-600' : 'bg-blue-600'
          } text-white hover:shadow-lg transition relative group`}
          title={isSharingScreen ? 'Stop Sharing' : 'Share Screen'}
        >
          <FontAwesomeIcon icon={faDesktop} />
          <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 -top-8">
            Screen Share
          </span>
        </button>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-3 rounded-full bg-blue-600 text-white hover:shadow-lg transition relative group"
          title={isChatOpen ? 'Close Chat' : 'Open Chat'}
        >
          <FontAwesomeIcon icon={faComments} />
          <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 -top-8">
            Chat
          </span>
        </button>
        <button
          onClick={endCall}
          className="p-3 rounded-full bg-red-600 text-white hover:shadow-lg transition relative group"
          title="End Call"
        >
          <FontAwesomeIcon icon={faSignOutAlt} />
          <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 -top-8">
            End Call
          </span>
        </button>
        {currentUser._id === participants.find((p) => p.id === currentUser._id)?.creatorId && (
          <div className="flex space-x-2">
            {participants
              .filter((p) => p.id !== currentUser._id)
              .map((p) => (
                <div key={p.id} className="flex items-center">
                  <span className="text-white">{p.name}</span>
                  <button
                    onClick={() => (p.isMuted ? unmuteUser(p.id) : muteUser(p.id))}
                    className={`ml-2 p-2 rounded-full ${
                      p.isMuted ? 'bg-green-600' : 'bg-red-600'
                    } text-white hover:shadow-lg transition relative group`}
                    title={p.isMuted ? `Unmute ${p.name}` : `Mute ${p.name}`}
                  >
                    <FontAwesomeIcon icon={p.isMuted ? faMicrophone : faMicrophoneSlash} />
                    <span className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 -top-8">
                      {p.isMuted ? 'Unmute' : 'Mute'}
                    </span>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
      {showPermissionModal && (
        <PermissionModal onClose={() => setShowPermissionModal(false)} onRetry={initializeVideoCall} />
      )}
      {notifications.length > 0 && (
        <div className="absolute top-4 right-4 w-64 bg-white shadow-lg rounded-lg p-4 z-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Notifications</h3>
            <button onClick={closeNotifications} className="text-gray-600 hover:text-gray-800">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className="p-2 mb-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
              onClick={() => handleNotificationClick(notification._id)}
            >
              {notification.message || 'New video call notification'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoCall;