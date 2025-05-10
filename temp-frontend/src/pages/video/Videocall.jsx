import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useVideoCall } from '../../contexts/VideoCallContext';
import { toast } from 'react-toastify';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faVideo, faVideoSlash, faDesktop, faComments, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';

const socket = io('http://localhost:5001', {
    auth: {
        token: localStorage.getItem('token')
    },
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

const VideoCall = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { token, currentUser } = useAuth();
    const { endVideoCall } = useVideoCall();
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
    const videoRef = useRef(null);
    const peersRef = useRef([]);
    const chatRef = useRef(null);
    const isMounted = useRef(true);

    const groupId = location.state?.groupId;
    const groupName = location.state?.groupName || 'Video Call';
    const roomId = location.state?.roomId;

    useEffect(() => {
        isMounted.current = true;
        socket.auth = { token: token || localStorage.getItem('token') };

        const initializeVideoCall = async () => {
            try {
                console.log('Initializing video call with:', { token: !!token, groupId, roomId });
                if (!token || !groupId || !roomId) {
                    throw new Error(`Missing required parameters: token=${!!token}, groupId=${groupId}, roomId=${roomId}`);
                }

                const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(userStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = userStream;
                }

                socket.connect();
                console.log('Socket.IO connecting...');

                socket.on('connect', () => {
                    console.log('Socket.IO connected');
                    if (isMounted.current) {
                        socket.emit('join-room', { roomId, groupId }, ({ error, participants }) => {
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
                        });
                    }
                });

                socket.on('signal', ({ from, signal, initiator }) => {
                    console.log('Received signal:', { from, initiator });
                    if (!isMounted.current) return;
                    const peer = peersRef.current.find(p => p.socketId === from);
                    if (peer) {
                        peer.peer.signal(signal);
                    } else {
                        const newPeer = new Peer({ initiator: false, trickle: false, stream: userStream });
                        newPeer.on('signal', data => {
                            socket.emit('signal', { to: from, signal: data });
                        });
                        newPeer.on('stream', peerStream => {
                            if (isMounted.current) {
                                setPeers(prev => [...prev, { socketId: from, stream: peerStream, peer: newPeer }]);
                            }
                        });
                        newPeer.signal(signal);
                        peersRef.current.push({ socketId: from, peer: newPeer });
                    }
                });

                socket.on('user-joined', ({ userId, name }) => {
                    console.log('User joined:', { userId, name });
                    if (!isMounted.current) return;
                    const newPeer = new Peer({ initiator: true, trickle: false, stream: userStream });
                    newPeer.on('signal', data => {
                        socket.emit('signal', { to: participants.find(p => p.id === userId)?.socketId, signal: data, initiator: true });
                    });
                    newPeer.on('stream', peerStream => {
                        if (isMounted.current) {
                            setPeers(prev => [...prev, { socketId: participants.find(p => p.id === userId)?.socketId, stream: peerStream, peer: newPeer }]);
                        }
                    });
                    peersRef.current.push({ socketId: participants.find(p => p.id === userId)?.socketId, peer: newPeer });
                });

                socket.on('participants-updated', updatedParticipants => {
                    console.log('Participants updated:', updatedParticipants);
                    if (isMounted.current) {
                        setParticipants(updatedParticipants);
                    }
                });

                socket.on('user-left', ({ userId }) => {
                    console.log('User left:', { userId });
                    if (isMounted.current) {
                        setPeers(prev => prev.filter(p => p.socketId !== participants.find(p => p.id === userId)?.socketId));
                        peersRef.current = peersRef.current.filter(p => p.socketId !== participants.find(p => p.id === userId)?.socketId);
                    }
                });

                socket.on('group-message', message => {
                    console.log('Group message:', message);
                    if (isMounted.current) {
                        setMessages(prev => [...prev, message]);
                        if (chatRef.current) {
                            chatRef.current.scrollTop = chatRef.current.scrollHeight;
                        }
                    }
                });

                socket.on('private-message', ({ from, message }) => {
                    console.log('Private message:', { from, message });
                    if (isMounted.current) {
                        setPrivateMessages(prev => ({
                            ...prev,
                            [from]: [...(prev[from] || []), message]
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
                        stream.getAudioTracks().forEach(track => (track.enabled = false));
                    }
                });

                socket.on('user-unmuted', ({ userId }) => {
                    console.log('User unmuted:', { userId });
                    if (isMounted.current && userId === currentUser._id) {
                        setIsMicOn(true);
                        stream.getAudioTracks().forEach(track => (track.enabled = true));
                    }
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket.IO connect_error:', err.message, err);
                    if (isMounted.current) {
                        toast.error(`Socket.IO connection failed: ${err.message}`);
                    }
                });

                socket.on('error', (err) => {
                    console.error('Socket.IO error:', err);
                });

                socket.on('muted-by-moderator', () => {
                    console.log('Muted by moderator');
                    if (isMounted.current) {
                        toast.info('You have been muted by the moderator');
                    }
                });

                socket.on('unmuted-by-moderator', () => {
                    console.log('Unmuted by moderator');
                    if (isMounted.current) {
                        toast.info('You have been unmuted by the moderator');
                    }
                });
            } catch (err) {
                console.error('Video call initialization error:', err);
                if (isMounted.current) {
                    toast.error(`Failed to start video call: ${err.message}`);
                    navigate('/my-groups');
                }
            }
        };

        initializeVideoCall();

        return () => {
            isMounted.current = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            socket.off('connect');
            socket.off('connect_error');
            socket.off('error');
            socket.off('signal');
            socket.off('user-joined');
            socket.off('participants-updated');
            socket.off('user-left');
            socket.off('group-message');
            socket.off('private-message');
            socket.off('user-muted');
            socket.off('user-unmuted');
            socket.off('muted-by-moderator');
            socket.off('unmuted-by-moderator');
            socket.disconnect();
            peersRef.current.forEach(p => p.peer.destroy());
            endVideoCall();
        };
    }, [token, groupId, roomId, navigate, currentUser, stream, endVideoCall]);

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => (track.enabled = !isMicOn));
            setIsMicOn(!isMicOn);
        }
    };

    const toggleCamera = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => (track.enabled = !isCameraOn));
            setIsCameraOn(!isCameraOn);
        }
    };

    const toggleScreenShare = async () => {
        if (isSharingScreen) {
            stream.getVideoTracks().forEach(track => track.stop());
            const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(userStream);
            if (videoRef.current) {
                videoRef.current.srcObject = userStream;
            }
            peersRef.current.forEach(p => p.peer.replaceTrack(
                stream.getVideoTracks()[0],
                userStream.getVideoTracks()[0],
                stream
            ));
            setIsSharingScreen(false);
        } else {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setStream(screenStream);
            if (videoRef.current) {
                videoRef.current.srcObject = screenStream;
            }
            peersRef.current.forEach(p => p.peer.replaceTrack(
                stream.getVideoTracks()[0],
                screenStream.getVideoTracks()[0],
                stream
            ));
            screenStream.getVideoTracks()[0].onended = () => toggleScreenShare();
            setIsSharingScreen(true);
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
                    data: reader.result
                };
                if (selectedUser) {
                    socket.emit('private-message', { roomId, to: participants.find(p => p.id === selectedUser).socketId, ...messageData });
                } else {
                    socket.emit('group-message', messageData);
                }
                setMessageInput('');
                setFile(null);
            };
            reader.readAsDataURL(file);
        } else {
            if (selectedUser) {
                socket.emit('private-message', { roomId, to: participants.find(p => p.id === selectedUser).socketId, ...messageData });
            } else {
                socket.emit('group-message', messageData);
            }
            setMessageInput('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">{groupName}</h1>
                <button
                    onClick={() => navigate('/my-groups')}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center"
                >
                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                    End Call
                </button>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <div className={`flex-1 p-4 ${isChatOpen ? 'mr-96' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="relative bg-black rounded-lg shadow-lg overflow-hidden">
                            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                            <div className="absolute bottom-2 left-2 bg-gray-800 text-white px-2 py-1 rounded">
                                {currentUser.name} {isSharingScreen ? '(Screen)' : ''}
                            </div>
                        </div>
                        {peers.map((peer, index) => (
                            <div key={index} className="relative bg-black rounded-lg shadow-lg overflow-hidden">
                                <video autoPlay className="w-full h-full object-cover" ref={video => {
                                    if (video && peer.stream) video.srcObject = peer.stream;
                                }} />
                                <div className="absolute bottom-2 left-2 bg-gray-800 text-white px-2 py-1 rounded">
                                    {participants.find(p => p.socketId === peer.socketId)?.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {isChatOpen && (
                    <div className="w-96 bg-white shadow-lg flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Chat</h2>
                            <select
                                value={selectedUser || ''}
                                onChange={e => setSelectedUser(e.target.value || null)}
                                className="border rounded px-2 py-1"
                            >
                                <option value="">Group Chat</option>
                                {participants
                                    .filter(p => p.id !== currentUser._id)
                                    .map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                            </select>
                        </div>
                        <div ref={chatRef} className="flex-1 p-4 overflow-y-auto">
                            {(selectedUser ? privateMessages[selectedUser] || [] : messages).map((msg, index) => (
                                <div key={index} className={`mb-2 ${msg.senderId === currentUser._id ? 'text-right' : ''}`}>
                                    <p className="text-sm text-gray-500">{msg.senderName} - {new Date(msg.timestamp).toLocaleTimeString()}</p>
                                    {msg.content && <p className="bg-gray-100 p-2 rounded">{msg.content}</p>}
                                    {msg.file && (
                                        <div>
                                            {msg.file.type.startsWith('image/') ? (
                                                <img src={msg.file.data} alt={msg.file.name} className="max-w-xs" />
                                            ) : (
                                                <a href={msg.file.data} download={msg.file.name} className="text-blue-600 hover:underline">
                                                    {msg.file.name}
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t">
                            <textarea
                                value={messageInput}
                                onChange={e => setMessageInput(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full border rounded p-2 mb-2"
                            />
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files[0])}
                                className="mb-2"
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
            <div className="bg-white shadow p-4 flex justify-center space-x-4">
                <button
                    onClick={toggleMic}
                    className={`p-3 rounded-full ${isMicOn ? 'bg-blue-600' : 'bg-red-600'} text-white`}
                >
                    <FontAwesomeIcon icon={isMicOn ? faMicrophone : faMicrophoneSlash} />
                </button>
                <button
                    onClick={toggleCamera}
                    className={`p-3 rounded-full ${isCameraOn ? 'bg-blue-600' : 'bg-red-600'} text-white`}
                >
                    <FontAwesomeIcon icon={isCameraOn ? faVideo : faVideoSlash} />
                </button>
                <button
                    onClick={toggleScreenShare}
                    className={`p-3 rounded-full ${isSharingScreen ? 'bg-green-600' : 'bg-blue-600'} text-white`}
                >
                    <FontAwesomeIcon icon={faDesktop} />
                </button>
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="p-3 rounded-full bg-blue-600 text-white"
                >
                    <FontAwesomeIcon icon={faComments} />
                </button>
                {currentUser._id === participants.find(p => p.id === currentUser._id)?.creatorId && (
                    <div className="flex space-x-2">
                        {participants
                            .filter(p => p.id !== currentUser._id)
                            .map(p => (
                                <div key={p.id} className="flex items-center">
                                    <span>{p.name}</span>
                                    <button
                                        onClick={() => p.isMuted ? unmuteUser(p.id) : muteUser(p.id)}
                                        className={`ml-2 p-2 rounded-full ${p.isMuted ? 'bg-green-600' : 'bg-red-600'} text-white`}
                                    >
                                        <FontAwesomeIcon icon={p.isMuted ? faMicrophone : faMicrophoneSlash} />
                                    </button>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoCall;