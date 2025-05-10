import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import StudentProfileForm from '../components/profile/StudentProfileForm';
import TeacherProfileForm from '../components/profile/TeacherProfileForm';
import ProfileHeader from '../components/profile/ProfileHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const API_URL = 'http://localhost:4000';

const Profile = () => {
  const { currentUser, userRole, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.success) {
          setProfile(response.data.data);
        } else {
          setError('Failed to load profile data');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.response?.data?.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  const handleUpdateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_URL}/api/users/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        setProfile(response.data.data);
        toast.success('Profile updated successfully');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleUpdateStudentProfile = async (studentProfileData) => {
    try {
      const response = await axios.put(`${API_URL}/api/users/profile/student`, studentProfileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        setProfile(response.data.data);
        toast.success('Student profile updated successfully');
      }
    } catch (err) {
      console.error('Error updating student profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update student profile');
    }
  };

  const handleUpdateTeacherProfile = async (teacherProfileData) => {
    try {
      const response = await axios.put(`${API_URL}/api/users/profile/teacher`, teacherProfileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        setProfile(response.data.data);
        toast.success('Teacher profile updated successfully');
      }
    } catch (err) {
      console.error('Error updating teacher profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update teacher profile');
    }
  };

  const handleUpdateProfilePicture = async (pictureUrl) => {
    try {
      const response = await axios.post(`${API_URL}/api/users/profile/picture`, 
        { profilePicture: pictureUrl },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data && response.data.success) {
        setProfile(response.data.data);
        toast.success('Profile picture updated successfully');
      }
    } catch (err) {
      console.error('Error updating profile picture:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile picture');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role={userRole}>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role={userRole}>
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={userRole}>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
        
        {profile && (
          <>
            <ProfileHeader 
              profile={profile} 
              onUpdateProfilePicture={handleUpdateProfilePicture}
            />
            
            <div className="bg-white rounded-lg shadow-md mt-6 p-6">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              
              {/* Common profile form for all roles */}
              <div className="mb-8">
                {userRole === 'student' && (
                  <StudentProfileForm 
                    profile={profile}
                    onUpdateProfile={handleUpdateProfile}
                    onUpdateStudentProfile={handleUpdateStudentProfile}
                  />
                )}
                
                {userRole === 'teacher' && (
                  <TeacherProfileForm 
                    profile={profile}
                    onUpdateProfile={handleUpdateProfile}
                    onUpdateTeacherProfile={handleUpdateTeacherProfile}
                  />
                )}
                
                {userRole === 'admin' && (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p>Admin profiles have limited customization options.</p>
                    <button
                      onClick={() => handleUpdateProfile({ 
                        name: profile.name,
                        bio: profile.bio || '',
                        phoneNumber: profile.phoneNumber || '' 
                      })}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Update Basic Info
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile; 