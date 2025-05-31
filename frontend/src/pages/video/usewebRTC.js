import { useState, useCallback, useEffect, useRef } from 'react';
import Peer from 'simple-peer';
import { toast } from 'react-toastify';

const useWebRTC = (socket, roomId, participants, setShowPermissionModal) => {
  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState(null);
  const peersRef = useRef([]);
  const isMounted = useRef(true);

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
  }, [setShowPermissionModal]);

  const initializeWebRTC = useCallback(async () => {
    const hasPermissions = await checkPermissions();
    let userStream = null;
    if (hasPermissions) {
      try {
        userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        setIsMicOn(true);
        setIsCameraOn(true);
        socket?.emit('toggle-video', { roomId, isVideoOn: true });
      } catch (err) {
        setShowPermissionModal(true);
        setIsMicOn(false);
        setIsCameraOn(false);
        toast.warn('Camera/microphone permissions denied. Joining call without media.');
        socket?.emit('toggle-video', { roomId, isVideoOn: false });
      }
    } else {
      setIsMicOn(false);
      setIsCameraOn(false);
      socket?.emit('toggle-video', { roomId, isVideoOn: false });
    }
  }, [socket, roomId, checkPermissions]);

  const toggleMic = useCallback(async () => {
    if (!stream) {
      const hasPermissions = await checkPermissions();
      if (hasPermissions) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setStream(newStream);
          setIsMicOn(true);
          setShowPermissionModal(false);
          peersRef.current.forEach((p) => {
            const audioTrack = newStream.getAudioTracks()[0];
            p.peer.addTrack(audioTrack, newStream);
          });
        } catch (err) {
          setShowPermissionModal(true);
          toast.error('Failed to access microphone: ' + err.message);
        }
      }
    } else {
      stream.getAudioTracks().forEach((track) => (track.enabled = !isMicOn));
      setIsMicOn(!isMicOn);
    }
  }, [stream, isMicOn, checkPermissions]);

  const toggleCamera = useCallback(async () => {
    if (!stream) {
      const hasPermissions = await checkPermissions();
      if (hasPermissions) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(newStream);
          setIsCameraOn(true);
          setShowPermissionModal(false);
          socket?.emit('toggle-video', { roomId, isVideoOn: true });
          peersRef.current.forEach((p) => {
            const videoTrack = newStream.getVideoTracks()[0];
            p.peer.addTrack(videoTrack, newStream);
          });
        } catch (err) {
          setShowPermissionModal(true);
          toast.error('Failed to access camera: ' + err.message);
        }
      }
    } else {
      stream.getVideoTracks().forEach((track) => (track.enabled = !isCameraOn));
      setIsCameraOn(!isCameraOn);
      socket?.emit('toggle-video', { roomId, isVideoOn: !isCameraOn });
    }
  }, [stream, isCameraOn, socket, roomId, checkPermissions]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isSharingScreen) {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        peersRef.current.forEach((p) => {
          const videoTrack = userStream.getVideoTracks()[0];
          const audioTrack = userStream.getAudioTracks()[0];
          p.peer.replaceTrack(stream.getVideoTracks()[0], videoTrack, userStream);
          p.peer.addTrack(audioTrack, userStream);
        });
        socket?.emit('screen-sharing', { roomId, isSharing: false });
        setIsSharingScreen(false);
        setIsCameraOn(true);
        socket?.emit('toggle-video', { roomId, isVideoOn: true });
        setScreenShareStream(null);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setStream(screenStream);
        peersRef.current.forEach((p) => {
          const videoTrack = screenStream.getVideoTracks()[0];
          p.peer.replaceTrack(stream.getVideoTracks()[0], videoTrack, screenStream);
        });
        screenStream.getVideoTracks()[0].onended = () => toggleScreenShare();
        socket?.emit('screen-sharing', { roomId, isSharing: true });
        setIsSharingScreen(true);
        setIsCameraOn(false);
        socket?.emit('toggle-video', { roomId, isVideoOn: false });
        setScreenShareStream(screenStream);
      }
    } catch (err) {
      console.error('Screen sharing error:', err);
      toast.error('Failed to share screen: ' + err.message);
    }
  }, [isSharingScreen, stream, socket, roomId]);

  const cleanupWebRTC = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (screenShareStream) {
      screenShareStream.getTracks().forEach((track) => track.stop());
      setScreenShareStream(null);
    }
    peersRef.current.forEach((p) => {
      if (p.peer) {
        p.peer.destroy();
      }
    });
    peersRef.current = [];
    setPeers([]);
    isMounted.current = false;
  }, [stream, screenShareStream]);

  useEffect(() => {
    if (!socket) return;

    socket.on('signal', ({ from, signal, initiator }) => {
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

    socket.on('screen-sharing', ({ userId, isSharing }) => {
      if (isMounted.current) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, isSharingScreen: isSharing } : p))
        );
        if (isSharing) {
          const peer = peersRef.current.find(
            (p) => p.socketId === participants.find((part) => part.id === userId)?.socketId
          );
          if (peer) {
            peer.peer.on('stream', (remoteStream) => {
              setScreenShareStream(remoteStream);
            });
          }
        } else {
          setScreenShareStream(null);
        }
      }
    });

    participants.forEach((participant) => {
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

    return () => {
      socket.off('signal');
      socket.off('screen-sharing');
    };
  }, [socket, stream, participants]);

  return {
    stream,
    peers,
    isMicOn,
    isCameraOn,
    isSharingScreen,
    screenShareStream,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    initializeWebRTC,
    cleanupWebRTC,
    checkPermissions,
  };
};

export default useWebRTC;