import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

const useSocket = (roomId, groupId, currentUser, token, navigate, refreshToken) => {
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const createSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Cleaning up existing socket before creating new one');
      socketRef.current.off();
      socketRef.current.disconnect();
    }

    console.log('Creating new socket instance');
    const newSocket = io(SOCKET_URL, {
      auth: { token, roomId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: false,
    });

    socketRef.current = newSocket;
    return newSocket;
  }, [token, roomId]);

  const initializeSocket = useCallback(
    async (activeRoomId = roomId) => {
      if (socketStatus === 'connecting') {
        console.log('Socket initialization already in progress, skipping');
        return false;
      }

      if (socketStatus === 'connected') {
        console.log('Socket already connected, skipping initialization');
        return true;
      }

      setSocketStatus('connecting');
      reconnectAttempts.current = 0;

      const attemptConnection = async () => {
        try {
          const newSocket = createSocket();
          newSocket.auth = { token, roomId: activeRoomId || roomId };

          console.log('Socket connecting with auth:', {
            tokenPrefix: token ? token.substring(0, 10) + '...' : 'undefined',
            roomId: activeRoomId || roomId,
          });

          const connectPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.error('Socket connection timeout after 10 seconds');
              reject(new Error('Connection timeout'));
            }, 10000);

            newSocket.once('connect', () => {
              clearTimeout(timeout);
              console.log('Socket connected successfully');
              if (!mountedRef.current) return reject(new Error('Component unmounted'));

              reconnectAttempts.current = 0;
              setSocketStatus('connected');
              resolve();

              newSocket.emit(
                'join-room',
                {
                  roomId: activeRoomId || roomId,
                  groupId,
                  userId: currentUser._id,
                  email: currentUser.email,
                  name: currentUser.name,
                },
                ({ error, participants }) => {
                  if (error) {
                    console.error('Join-room error:', error);
                    if (mountedRef.current) {
                      setSocketStatus('error');
                      navigate('/my-groups');
                    }
                    return;
                  }
                  console.log('Join-room success, participants:', participants);
                  if (mountedRef.current) {
                    setParticipants(participants);
                  }
                }
              );
            });

            newSocket.once('connect_error', async (err) => {
              clearTimeout(timeout);
              console.error('Socket connection error:', err);

              if (err.message.includes('Authentication') || err.message.includes('auth')) {
                console.warn('Authentication error, attempting token refresh');
                const refreshed = await refreshToken();
                if (refreshed) {
                  newSocket.auth.token = token;
                  return reject(new Error('Auth error - will retry with new token'));
                } else {
                  setSocketStatus('error');
                  navigate('/login');
                  return reject(new Error('Authentication failed'));
                }
              }

              reject(err);
            });
          });

          newSocket.connect();
          await connectPromise;
          return true;
        } catch (error) {
          console.error(`Socket connection attempt ${reconnectAttempts.current + 1} failed:`, error.message);
          reconnectAttempts.current++;

          if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.error(`Max reconnection attempts (${maxReconnectAttempts}) reached`);
            setSocketStatus('error');
            throw new Error(`Failed to connect after ${maxReconnectAttempts} attempts: ${error.message}`);
          }

          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Retrying connection in ${delay}ms...`);

          if (mountedRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(attemptConnection, delay);
          }
          return false;
        }
      };

      return await attemptConnection();
    },
    [token, roomId, groupId, currentUser, navigate, refreshToken, createSocket, socketStatus]
  );

  const cleanupSocket = useCallback(() => {
    console.log('Cleaning up socket');
    clearTimeout(reconnectTimeoutRef.current);

    if (socketRef.current) {
      console.log('Disconnecting socket');
      socketRef.current.off();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setSocketStatus('disconnected');
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!socketRef.current) return;

    const socket = socketRef.current;

    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      if (!mountedRef.current) return;

      if (reason === 'io server disconnect') {
        setSocketStatus('disconnected');
        initializeSocket();
      } else if (reason === 'transport close' || reason === 'ping timeout') {
        setSocketStatus('connecting');
      } else {
        setSocketStatus('disconnected');
      }
    };

    const handleError = (err) => {
      console.error('Socket error:', err);
      if (mountedRef.current) {
        setSocketStatus('error');
      }
    };

    const handleParticipantsUpdated = (updatedParticipants) => {
      console.log('Participants updated:', updatedParticipants);
      if (mountedRef.current) {
        setParticipants(updatedParticipants);
      }
    };

    const handleUserLeft = ({ userId }) => {
      console.log('User left:', userId);
      if (mountedRef.current) {
        setParticipants((prev) => prev.filter((p) => p.id !== userId));
      }
    };

    const handleGroupMessage = (message) => {
      console.log('Group message received:', message);
      if (mountedRef.current) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handlePrivateMessage = ({ from, message }) => {
      console.log('Private message received from:', from);
      if (mountedRef.current) {
        setPrivateMessages((prev) => ({
          ...prev,
          [message.senderId]: [...(prev[message.senderId] || []), message],
        }));
      }
    };

    const handleCallEnded = () => {
      console.log('Call ended by host');
      if (mountedRef.current) {
        cleanupSocket();
        navigate('/my-groups');
      }
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);
    socket.on('participants-updated', handleParticipantsUpdated);
    socket.on('user-left', handleUserLeft);
    socket.on('group-message', handleGroupMessage);
    socket.on('private-message', handlePrivateMessage);
    socket.on('call-ended', handleCallEnded);

    socket.io.on('reconnect', (attempt) => {
      console.log(`Socket reconnected after ${attempt} attempts`);
      if (mountedRef.current) {
        setSocketStatus('connected');
      }
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnect attempt ${attempt}`);
      if (mountedRef.current) {
        setSocketStatus('connecting');
      }
    });

    socket.io.on('reconnect_error', (error) => {
      console.error('Socket reconnect error:', error);
      if (mountedRef.current) {
        setSocketStatus('connecting');
      }
    });

    socket.io.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      if (mountedRef.current) {
        setSocketStatus('error');
      }
    });

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.off('participants-updated', handleParticipantsUpdated);
      socket.off('user-left', handleUserLeft);
      socket.off('group-message', handleGroupMessage);
      socket.off('private-message', handlePrivateMessage);
      socket.off('call-ended', handleCallEnded);

      socket.io.off('reconnect');
      socket.io.off('reconnect_attempt');
      socket.io.off('reconnect_error');
      socket.io.off('reconnect_failed');
    };
  }, [initializeSocket, cleanupSocket, navigate]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupSocket();
    };
  }, [cleanupSocket]);

  return {
    socket: socketRef.current,
    participants,
    messages,
    privateMessages,
    setMessages,
    setPrivateMessages,
    initializeSocket,
    cleanupSocket,
    socketStatus,
  };
};

export default useSocket;