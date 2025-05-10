import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faChalkboardTeacher, faBook, faAward, faBriefcase, faCertificate } from '@fortawesome/free-solid-svg-icons';

// API base URL
const API_URL = 'http://localhost:4000';

const TeacherProfile = () => {
  const { id } = useParams();
  const { userRole, token } = useAuth();
  const navigate = useNavigate();
  
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mentoredGroups, setMentoredGroups] = useState([]);

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        setLoading(true);
        // Fetch teacher profile data
        const response = await axios.get(`${API_URL}/api/users/profile/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.success) {
          setTeacherProfile(response.data.data);
          
          // Also fetch groups this teacher is mentoring
          const groupsResponse = await axios.get(`${API_URL}/api/groups`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (groupsResponse.data) {
            const mentorGroups = groupsResponse.data.filter(group => 
              group.mentor && (group.mentor._id === id || group.mentor === id)
            );
            setMentoredGroups(mentorGroups);
          }
        } else {
          setError('Failed to load teacher profile data');
        }
      } catch (err) {
        console.error('Error fetching teacher profile:', err);
        setError(err.response?.data?.message || 'Failed to load teacher profile data');
      } finally {
        setLoading(false);
      }
    };

    if (token && id) {
      fetchTeacherProfile();
    }
  }, [token, id]);

  const handleGoBack = () => {
    navigate(-1);
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
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!teacherProfile) {
    return (
      <DashboardLayout role={userRole}>
        <div className="text-center p-8">
          <div className="text-gray-500 mb-4">Teacher profile not found</div>
          <button 
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={userRole}>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <button 
          onClick={handleGoBack}
          className="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md inline-flex items-center"
        >
          &larr; Back
        </button>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header with profile picture */}
          <div className="bg-blue-700 text-white p-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-24 h-24 mb-4 md:mb-0 md:mr-6">
                {teacherProfile.profilePicture ? (
                  <img 
                    src={teacherProfile.profilePicture} 
                    alt={teacherProfile.name} 
                    className="w-full h-full rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-blue-800 flex items-center justify-center text-3xl font-bold">
                    {teacherProfile.name ? teacherProfile.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold">{teacherProfile.name}</h1>
                <p className="text-blue-200">Teacher / Mentor</p>
                {teacherProfile.email && (
                  <p className="mt-1 text-white">{teacherProfile.email}</p>
                )}
                {userRole === 'student' && (
                  <Link
                    to="/student/communication"
                    className="mt-2 inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Message Mentor
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bio section */}
              <div className="col-span-2">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">About</h2>
                <p className="text-gray-600">
                  {teacherProfile.bio || "No bio information available."}
                </p>
              </div>
              
              {/* Teacher information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Expertise</h2>
                <div className="space-y-3">
                  {teacherProfile.teacherProfile?.expertise?.length > 0 ? (
                    <ul className="space-y-2">
                      {teacherProfile.teacherProfile.expertise.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <FontAwesomeIcon icon={faBook} className="text-blue-600 mt-1 mr-2" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No expertise information available.</p>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Qualifications</h2>
                <div className="space-y-3">
                  {teacherProfile.teacherProfile?.qualifications?.length > 0 ? (
                    <ul className="space-y-2">
                      {teacherProfile.teacherProfile.qualifications.map((qualification, index) => (
                        <li key={index} className="flex items-start">
                          <FontAwesomeIcon icon={faGraduationCap} className="text-blue-600 mt-1 mr-2" />
                          <span>{qualification}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No qualification information available.</p>
                  )}
                </div>
              </div>
              
              {/* Courses taught section */}
              <div className="col-span-2">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Courses Taught</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherProfile.teacherProfile?.coursesTaught?.length > 0 ? (
                    teacherProfile.teacherProfile.coursesTaught.map((course, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start">
                          <FontAwesomeIcon icon={faChalkboardTeacher} className="text-blue-600 mt-1 mr-2" />
                          <div>
                            <h3 className="font-semibold text-gray-800">{course}</h3>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2">
                      <p className="text-gray-500">No courses information available.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Mentored Groups section */}
              <div className="col-span-2">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Mentored Groups</h2>
                {mentoredGroups.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mentoredGroups.map(group => (
                      <div key={group._id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                        <p className="text-gray-600 mt-1">{group.description}</p>
                        <div className="flex items-center mt-2">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {group.subject}
                          </span>
                          <span className="ml-2 text-gray-500 text-sm">
                            {group.members.length}/{group.maxMembers} members
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">This teacher is not currently mentoring any groups.</p>
                )}
              </div>
              
              {/* Additional information */}
              {teacherProfile.teacherProfile?.achievements?.length > 0 && (
                <div className="col-span-2">
                  <h2 className="text-xl font-semibold text-gray-800 mb-3">Achievements & Awards</h2>
                  <ul className="space-y-2">
                    {teacherProfile.teacherProfile.achievements.map((achievement, index) => (
                      <li key={index} className="flex items-start">
                        <FontAwesomeIcon icon={faAward} className="text-blue-600 mt-1 mr-2" />
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {teacherProfile.teacherProfile?.experience?.length > 0 && (
                <div className="col-span-2">
                  <h2 className="text-xl font-semibold text-gray-800 mb-3">Professional Experience</h2>
                  <ul className="space-y-4">
                    {teacherProfile.teacherProfile.experience.map((exp, index) => (
                      <li key={index} className="flex items-start">
                        <FontAwesomeIcon icon={faBriefcase} className="text-blue-600 mt-1 mr-2" />
                        <div>
                          <div className="font-semibold">{exp}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {teacherProfile.teacherProfile?.certifications?.length > 0 && (
                <div className="col-span-2">
                  <h2 className="text-xl font-semibold text-gray-800 mb-3">Certifications</h2>
                  <ul className="space-y-2">
                    {teacherProfile.teacherProfile.certifications.map((cert, index) => (
                      <li key={index} className="flex items-start">
                        <FontAwesomeIcon icon={faCertificate} className="text-blue-600 mt-1 mr-2" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherProfile; 