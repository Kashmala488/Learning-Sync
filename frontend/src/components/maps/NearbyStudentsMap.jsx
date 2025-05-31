import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = 'http://localhost:4000';
const GOOGLE_MAPS_API_KEY = 'AIzaSyB9irjntPHdEJf024h7H_XKpS110eW1Nh8';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: true
};

const NearbyStudentsMap = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const { token } = useAuth();
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [nearbyStudents, setNearbyStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch nearby students
  const fetchNearbyStudents = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/students/nearby`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setNearbyStudents(response.data.data.nearbyStudents);
        
        // Set center to current user's location
        const userLocation = response.data.data.currentUser.location;
        if (userLocation?.coordinates?.length === 2) {
          setCenter({ 
            lat: userLocation.coordinates[1], 
            lng: userLocation.coordinates[0] 
          });
        }
      }
    } catch (err) {
      console.error('Error fetching nearby students:', err);
      setError('Failed to fetch nearby students');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNearbyStudents();
  }, [fetchNearbyStudents]);

  if (!isLoaded) return <div className="text-center p-4">Loading maps...</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800">Nearby Students</h3>
        <button 
          onClick={fetchNearbyStudents}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        options={options}
      >
        {/* Current user's location marker */}
        {center.lat !== 0 && (
          <Marker
            position={center}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }}
          />
        )}

        {/* Nearby students markers */}
        {nearbyStudents.map((student) => {
          if (!student.location?.coordinates || student.location.coordinates.length !== 2) {
            return null;
          }
          
          const position = {
            lat: student.location.coordinates[1],
            lng: student.location.coordinates[0]
          };
          
          return (
            <Marker
              key={student._id}
              position={position}
              onClick={() => setSelectedStudent(student)}
            />
          );
        })}

        {/* Info window for selected student */}
        {selectedStudent && (
          <InfoWindow
            position={{
              lat: selectedStudent.location.coordinates[1],
              lng: selectedStudent.location.coordinates[0]
            }}
            onCloseClick={() => setSelectedStudent(null)}
          >
            <div className="p-2 max-w-xs">
              <div className="flex items-center">
                {selectedStudent.profilePicture ? (
                  <img 
                    src={selectedStudent.profilePicture} 
                    alt={selectedStudent.name}
                    className="w-8 h-8 rounded-full mr-2" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-800">{selectedStudent.name}</h3>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="mt-3 text-sm text-gray-600">
        {loading ? 'Loading nearby students...' : 
         nearbyStudents.length === 0 ? 'No students found nearby' : 
         `Found ${nearbyStudents.length} students nearby`}
      </div>
    </div>
  );
};

export default NearbyStudentsMap; 