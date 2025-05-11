import React from 'react';

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

export default PermissionModal;