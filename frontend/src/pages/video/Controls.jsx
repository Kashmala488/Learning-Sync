import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
  faVideo,
  faVideoSlash,
  faDesktop,
  faComments,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';

const Controls = ({
  isMicOn,
  isCameraOn,
  isSharingScreen,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  setIsChatOpen,
  endCall,
  currentUser,
  participants,
  socket,
  roomId,
}) => {
  const muteUser = (userId) => {
    socket.emit('mute-user', { roomId, userId });
  };

  const unmuteUser = (userId) => {
    socket.emit('unmute-user', { roomId, userId });
  };

  return (
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
        onClick={() => setIsChatOpen((prev) => !prev)}
        className="p-3 rounded-full bg-blue-600 text-white hover:shadow-lg transition relative group"
        title="Toggle Chat"
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
  );
};

export default Controls;