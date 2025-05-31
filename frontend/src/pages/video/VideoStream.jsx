import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

const playVideo = async (videoElement, stream) => {
  if (!videoElement || !stream) return;
  try {
    videoElement.srcObject = stream;
    if (document.body.contains(videoElement)) {
      await videoElement.play();
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Video play error:', err);
    }
  }
};

const VideoStream = ({ stream, isVideoOn, name, isSharingScreen }) => {
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
    <div className="relative w-full h-full">
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
    </div>
  );
};

export default VideoStream;