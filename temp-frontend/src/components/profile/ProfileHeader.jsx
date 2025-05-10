import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';

const ProfileHeader = ({ profile, onUpdateProfilePicture }) => {
  const { userRole } = useAuth();
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const handleImageSubmit = (e) => {
    e.preventDefault();
    if (imageUrl.trim()) {
      onUpdateProfilePicture(imageUrl);
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const roleLabels = {
    'student': 'Student',
    'teacher': 'Teacher',
    'admin': 'Administrator'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Profile picture section */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <FontAwesomeIcon icon={faUser} className="text-gray-400 text-4xl" />
            )}
          </div>
          
          <button
            onClick={() => setShowImageInput(!showImageInput)}
            className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-md hover:bg-blue-700"
            title="Update profile picture"
          >
            <FontAwesomeIcon icon={faCamera} />
          </button>
        </div>
        
        {/* User details section */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{profile.name}</h2>
          <div className="mb-2">
            <span className="inline-block px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
              {roleLabels[userRole] || 'User'}
            </span>
          </div>
          <p className="text-gray-500 mb-2">{profile.email}</p>
          {profile.bio && (
            <p className="text-gray-600 mt-2 max-w-2xl">{profile.bio}</p>
          )}
        </div>
      </div>
      
      {/* Profile picture URL input */}
      {showImageInput && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <form onSubmit={handleImageSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImageInput(false);
                  setImageUrl('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Enter the URL of your profile picture. For best results, use a square image.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader; 