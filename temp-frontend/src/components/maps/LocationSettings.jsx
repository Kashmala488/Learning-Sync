import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = 'http://localhost:4000';

const LocationSettings = () => {
  const { currentUser, token } = useAuth();
  const [locationSharing, setLocationSharing] = useState(
    currentUser?.location?.locationSharing !== false
  );
  const [loading, setLoading] = useState(false);

  const toggleLocationSharing = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Get current location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Update location with toggled sharing setting
          const response = await axios.post(`${API_URL}/api/users/update-location`, {
            coordinates: [longitude, latitude],
            locationSharing: !locationSharing
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            setLocationSharing(!locationSharing);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error updating location sharing:', err);
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 flex items-center">
      <label className="inline-flex items-center cursor-pointer">
        <input 
          type="checkbox"
          className="sr-only peer"
          checked={locationSharing}
          onChange={toggleLocationSharing}
          disabled={loading}
        />
        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        <span className="ms-3 text-sm font-medium text-gray-700">
          {locationSharing ? 'Location sharing enabled' : 'Location sharing disabled'}
        </span>
      </label>
    </div>
  );
};

export default LocationSettings; 