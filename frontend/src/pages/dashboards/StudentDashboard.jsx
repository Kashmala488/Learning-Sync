import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faQuestionCircle, 
  faRoad, 
  faUsers, 
  faChartBar,
  faGraduationCap,
  faTrophy,
  faTasks,
  faUserFriends,
  faArrowRight,
  faChevronRight,
  faVideo,
  faFileAlt,
  faChalkboardTeacher,
  faBook,
  faRobot,
  faShareAlt,
  faStar,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import NearbyStudentsMap from '../../components/maps/NearbyStudentsMap';
import LocationSettings from '../../components/maps/LocationSettings';
import api from '../../utils/api';

// API base URL
const API_URL = 'http://localhost:4000';

const StudentDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    learningPaths: [],
    recommendations: [],
    upcomingSessions: [],
    analytics: null,
    resources: []
  });
  const [currentMood, setCurrentMood] = useState('neutral');
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use the new consolidated dashboard endpoint
        const dashboardResponse = await api.get(`${API_URL}/api/students/dashboard`);
        
        // Get upcoming sessions from groups endpoint 
        const sessionsResponse = await api.get(`${API_URL}/api/groups`, {
          params: { upcoming: true, limit: 3 }
        });
        
        // Extract data from responses
        const dashboardData = dashboardResponse.data;
        const upcomingSessions = sessionsResponse.status === 200 ? sessionsResponse.data : [];
        
        setDashboardData({
          learningPaths: dashboardData.learningPaths || [],
          recommendations: dashboardData.recommendations || [],
          upcomingSessions,
          analytics: dashboardData.analytics || null,
          resources: dashboardData.resources || []
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const handleMoodSelection = async (mood) => {
    try {
      setCurrentMood(mood);
      
      // Save mood to database
      await api.post(`${API_URL}/api/students/mood`, {
        mood,
        stress: 5, // Default value
        energy: 5  // Default value
      });
      
    } catch (err) {
      console.error('Error setting mood:', err);
      // Don't show an error, just log it - the mood is still set in the UI
    }
  };

  const renderMoodTracker = () => {
    const moods = [
      { value: 'happy', emoji: '😀' },
      { value: 'neutral', emoji: '😐' },
      { value: 'confused', emoji: '😕' },
      { value: 'frustrated', emoji: '😤' },
      { value: 'tired', emoji: '😴' }
    ];
    
    return (
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">How are you feeling today?</h3>
        <div className="flex justify-between">
          {moods.map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodSelection(mood.value)}
              className={`text-2xl hover:transform hover:scale-125 transition-transform p-2 rounded-full ${
                currentMood === mood.value ? 'bg-blue-100' : ''
              }`}
            >
              {mood.emoji}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Helper function to determine resource type based on content
  const getResourceType = (resource) => {
    if (!resource || !resource.title) return 'document';
    
    const title = resource.title.toLowerCase();
    if (title.includes('video')) return 'video';
    if (title.includes('article')) return 'article';
    if (title.includes('tutorial')) return 'tutorial';
    return 'document';
  };

  // Helper function to get resource icon
  const getResourceIcon = (resourceType) => {
    switch (resourceType) {
      case 'video':
        return faVideo;
      case 'article':
        return faFileAlt;
      case 'tutorial':
        return faChalkboardTeacher;
      default:
        return faBook;
    }
  };

  // Function to refresh the map when location settings change
  const handleLocationSettingsChange = () => {
    setMapKey(Date.now()); // Force the map to remount
  };

  if (loading) {
    return (
      <DashboardLayout role="student">
        <LoadingSpinner size="lg" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="student">
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const { learningPaths, recommendations, upcomingSessions, analytics, resources } = dashboardData;

  return (
    <DashboardLayout role="student">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name || 'Student'}!</h2>
        <p className="text-gray-600">Here's an overview of your learning journey.</p>
      </div>

      {renderMoodTracker()}

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Quick Actions</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/quizzes/practice"
            className="bg-blue-600 text-white p-4 rounded-lg shadow text-center hover:bg-blue-700 transition-colors"
          >
            <FontAwesomeIcon icon={faQuestionCircle} className="text-3xl mb-2" />
            <div className="font-medium">Take Practice Quiz</div>
          </Link>
          
          <Link
            to="/learning-paths"
            className="bg-green-600 text-white p-4 rounded-lg shadow text-center hover:bg-green-700 transition-colors"
          >
            <FontAwesomeIcon icon={faRoad} className="text-3xl mb-2" />
            <div className="font-medium">Learning Paths</div>
          </Link>
          
          <Link
            to="/collaboration"
            className="bg-purple-600 text-white p-4 rounded-lg shadow text-center hover:bg-purple-700 transition-colors"
          >
            <FontAwesomeIcon icon={faUsers} className="text-3xl mb-2" />
            <div className="font-medium">Collaboration</div>
          </Link>
          
          <Link
            to="/resources/generate"
            className="bg-indigo-600 text-white p-4 rounded-lg shadow text-center hover:bg-indigo-700 transition-colors"
          >
            <FontAwesomeIcon icon={faRobot} className="text-3xl mb-2" />
            <div className="font-medium">Generate Resource</div>
          </Link>
        </div>
      </div>

      {/* Learning Groups */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Learning Groups</h3>
          <Link to="/my-groups" className="text-blue-600 hover:underline flex items-center">
            <span>View All Groups</span>
            <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
          </Link>
        </div>
        
        {dashboardData.upcomingSessions && dashboardData.upcomingSessions.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {dashboardData.upcomingSessions.slice(0, 3).map((group, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
                  <div className="flex items-start mb-2">
                    <FontAwesomeIcon icon={faUserFriends} className="text-blue-600 mt-1 mr-2" />
                    <div>
                      <h4 className="font-semibold text-gray-800">{group.name}</h4>
                      <p className="text-sm text-gray-600">{group.subject}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {group.members?.length || 0} members
                      </span>
                      {group.mentor && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Mentor: {' '}
                          <Link 
                            to={`/teacher-profile/${group.mentor._id}`}
                            className="hover:underline"
                          >
                            {group.mentor.name || 'Teacher'}
                          </Link>
                        </span>
                      )}
                    </div>
                    <Link 
                      to={`/quizzes/practice?groupId=${group._id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Take Quiz
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <FontAwesomeIcon icon={faUserFriends} className="text-gray-400 text-4xl mb-3" />
            <p className="text-gray-600 mb-4">You haven't joined any study groups yet.</p>
            <Link
              to="/my-groups"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Join Learning Groups
            </Link>
          </div>
        )}
      </div>

      {/* Analytics/Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <FontAwesomeIcon icon={faGraduationCap} className="text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm">Average Quiz Score</h3>
              <p className="font-semibold text-2xl">
                {analytics?.quizAnalytics?.averageScore 
                  ? Math.round(analytics.quizAnalytics.averageScore) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <FontAwesomeIcon icon={faTrophy} className="text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm">Completed Paths</h3>
              <p className="font-semibold text-2xl">
                {analytics?.learningPathAnalytics?.completedPaths || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <FontAwesomeIcon icon={faTasks} className="text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm">Active Paths</h3>
              <p className="font-semibold text-2xl">
                {analytics?.learningPathAnalytics?.activePaths || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-full">
              <FontAwesomeIcon icon={faUserFriends} className="text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm">Collaboration Groups</h3>
              <p className="font-semibold text-2xl">
                {upcomingSessions?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Paths */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Your Learning Paths</h3>
          <Link to="/learning-paths" className="text-blue-600 hover:text-blue-800">
            View All <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </Link>
        </div>
        
        {learningPaths.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {learningPaths.map(path => (
              <div key={path._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4">
                  <h4 className="font-medium text-gray-800 mb-2">{path.title}</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${path.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{path.progress}% complete</span>
                    <Link to={`/learning-paths/${path._id}`} className="text-blue-600 hover:text-blue-800">
                      Continue <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">You don't have any learning paths yet.</p>
          </div>
        )}
      </div>

      {/* Resources Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Learning Resources</h3>
          <Link to="/resources" className="text-blue-600 hover:text-blue-800">
            View All <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </Link>
        </div>
        
        {resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resources.map(resource => {
              const resourceType = getResourceType(resource);
              const resourceIcon = getResourceIcon(resourceType);
              
              return (
                <div key={resource._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <FontAwesomeIcon icon={resourceIcon} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{resource.title}</h4>
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FontAwesomeIcon
                                key={star}
                                icon={faStar}
                                className={`text-xs ${
                                  parseFloat(resource.averageRating) >= star 
                                    ? 'text-yellow-400' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500 ml-1">
                            ({resource.averageRating || '0'})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {resource.content?.substring(0, 80)}
                      {resource.content?.length > 80 ? '...' : ''}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/resources/${resource._id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Resource <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                      </Link>
                      <Link
                        to={`/resources/${resource._id}`}
                        title="Share with classmates"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <FontAwesomeIcon icon={faShareAlt} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No learning resources available yet.</p>
              <Link 
                to="/resources/generate" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generate Your First Resource <FontAwesomeIcon icon={faRobot} className="ml-1" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Recommended for You</h3>
          <Link to="/resources" className="text-blue-600 hover:text-blue-800">
            View All <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </Link>
        </div>
        
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations.map(resource => {
              const getIconClass = () => {
                if (resource.title.toLowerCase().includes('video')) return faVideo;
                if (resource.title.toLowerCase().includes('article')) return faFileAlt;
                if (resource.title.toLowerCase().includes('tutorial')) return faChalkboardTeacher;
                return faBook;
              };
              
              const getType = () => {
                if (resource.title.toLowerCase().includes('video')) return 'video';
                if (resource.title.toLowerCase().includes('article')) return 'article';
                if (resource.title.toLowerCase().includes('tutorial')) return 'tutorial';
                return 'document';
              };
              
              return (
                <div key={resource._id} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <FontAwesomeIcon icon={getIconClass()} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-500 uppercase">{getType()}</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2 line-clamp-2">{resource.title}</h4>
                  <Link to={`/resources/${resource._id}`} className="text-blue-600 hover:text-blue-800 text-sm inline-block mt-2">
                    View Resource <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No recommendations available at the moment.</p>
          </div>
        )}
      </div>

      {/* Nearby Students Map */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4">
            <div className="flex items-center mb-2">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">Nearby Students</h3>
            </div>
            <NearbyStudentsMap key={mapKey} />
            <LocationSettings onSettingsChange={handleLocationSettingsChange} />
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Upcoming Collaboration Sessions</h3>
          <Link to="/collaboration" className="text-blue-600 hover:text-blue-800">
            View All <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </Link>
        </div>
        
        {upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingSessions.map((session) => (
                  <tr key={session._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{session.name}</div>
                      <div className="text-sm text-gray-500">{session.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {session.members?.length || 0} / {session.maxMembers || 10}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/collaboration?group=${session._id}`} className="text-blue-600 hover:text-blue-900">
                        Join Session
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No upcoming sessions scheduled.</p>
            <Link to="/collaboration" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
              Find a collaboration group
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;