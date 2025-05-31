import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faSignOutAlt, 
  faBell, 
  faRoad, 
  faBook, 
  faQuestionCircle, 
  faChartBar, 
  faUsers, 
  faCog, 
  faClipboardList, 
  faUsersCog, 
  faGraduationCap, 
  faList, 
  faHistory,
  faUser,
  faUserFriends,
  faFileAlt,
  faEnvelope,
  faBars,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import axios from 'axios';

const DashboardLayout = ({ children, role = 'student' }) => {
  const { logout, userRole, token, currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const API_URL = 'http://localhost:4000/api';
  const effectiveRole = role || userRole || 'student';

  const fetchNotifications = async () => {
    try {
      // Get fresh token from localStorage
      const currentToken = localStorage.getItem('token');
      
      if (!currentToken) {
        console.warn('No token found, redirecting to login');
        navigate('/login');
        return;
      }

      let endpoint = '';
      if (effectiveRole === 'teacher') {
        endpoint = `${API_URL}/teachers/notifications`;
      } else if (effectiveRole === 'student') {
        endpoint = `${API_URL}/students/notifications`;
      } else if (effectiveRole === 'admin') {
        endpoint = `${API_URL}/admin/notifications`;
      }
      
      if (endpoint) {
        const response = await axios.get(endpoint, {
          headers: { 
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data) {
          setNotifications(response.data);
          setUnreadCount(response.data.filter(n => !n.isRead).length);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        navigate('/login');
      }
      console.error('Error fetching notifications:', err.response?.data || err.message);
    }
  };

  useEffect(() => {
    let intervalId = null;

    const startPolling = async () => {
      // Initial fetch
      await fetchNotifications();
      
      // Setup polling
      intervalId = setInterval(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          clearInterval(intervalId);
          return;
        }
        await fetchNotifications();
      }, 30000);
    };

    if (localStorage.getItem('token')) {
      startPolling();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [effectiveRole]);

  const handleMarkRead = async (notificationId) => {
    try {
      let endpoint = '';
      if (effectiveRole === 'teacher') {
        endpoint = `${API_URL}/teachers/notifications/${notificationId}/read`;
      } else if (effectiveRole === 'student') {
        endpoint = `${API_URL}/students/notifications/${notificationId}/read`;
      } else if (effectiveRole === 'admin') {
        endpoint = `${API_URL}/admin/notifications/${notificationId}/read`;
      }
      
      if (endpoint) {
        await axios.put(endpoint, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(unreadCount - 1);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (token && effectiveRole === 'student') {
        try {
          const response = await axios.get('http://localhost:4000/api/students/messages', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const user = JSON.parse(localStorage.getItem('user'));
          const currentUserId = user?.id;
          
          if (!currentUserId) return;
          
          const unreadCount = response.data.filter(msg => 
            msg.senderId._id !== currentUserId && 
            !msg.isRead.includes(currentUserId)
          ).length;
          
          setUnreadMessages(unreadCount);
        } catch (error) {
          console.error('Error checking unread messages:', error);
        }
      }
    };
    
    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [token, effectiveRole]);

  return (
    <div className="flex h-screen bg-gray-100">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div 
        className={`fixed md:relative w-64 h-screen bg-white shadow-md z-20 transition-transform duration-300 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Learning Platform</h2>
            <button 
              className="md:hidden text-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>
        <nav className="p-2 overflow-y-auto" style={{ height: 'calc(100vh - 70px)' }}>
          <Link to="/dashboard" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
            <FontAwesomeIcon icon={faHome} className="mr-3" />
            Dashboard
          </Link>
          
          {effectiveRole === 'student' && (
            <>
              <Link to="/quizzes" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faQuestionCircle} className="mr-3" />
                Take Quizzes
              </Link>
              <Link to="/previous-quizzes" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faHistory} className="mr-3" />
                Previous Quizzes
              </Link>
              <Link to="/resources" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faBook} className="mr-3" />
                Learning Resources
              </Link>
              <Link to="/learning-paths" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faRoad} className="mr-3" />
                Learning Paths
              </Link>
              <Link to="/student/groups" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faUserFriends} className="mr-3" />
                Collaboration Hub
              </Link>
              <Link to="/student/communication" className="flex items-center p-4 text-gray-700 hover:bg-gray-200 relative">
                <FontAwesomeIcon icon={faEnvelope} className="mr-3" />
                Message Mentors
                {unreadMessages > 0 && (
                  <span className="absolute top-4 left-6 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </Link>
            </>
          )}
          
          {effectiveRole === 'teacher' && (
            <>
              <Link to="/teacher/students" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faUsers} className="mr-3" />
                Manage Students
              </Link>
              <Link to="/teacher/resources" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faBook} className="mr-3" />
                Assign Resources
              </Link>
              <Link to="/teacher/analytics" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faChartBar} className="mr-3" />
                View Analytics
              </Link>
              <Link to="/teacher/communication" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faUsersCog} className="mr-3" />
                Communicate
              </Link>
              <Link to="/teacher/groups" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faUserFriends} className="mr-3" />
                Group Mentoring
              </Link>
            </>
          )}
          
          {effectiveRole === 'admin' && (
            <>
              <Link to="/admin/users" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faUsers} className="mr-3" />
                User Management
              </Link>
              <Link to="/admin/moderation" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faGraduationCap} className="mr-3" />
                Course Moderation
              </Link>
              <Link to="/admin/analytics" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faClipboardList} className="mr-3" />
                Reports & Analytics
              </Link>
              <Link to="/admin/settings" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faCog} className="mr-3" />
                System Settings
              </Link>
              <Link to="/admin/security-alerts" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
                <FontAwesomeIcon icon={faHistory} className="mr-3" />
                Activity Logs
              </Link>
            </>
          )}

          <Link to="/profile" className="flex items-center p-4 text-gray-700 hover:bg-gray-200">
            <FontAwesomeIcon icon={faUser} className="mr-3" />
            My Profile
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-4 text-gray-700 hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />
            Logout
          </button>
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow ">
          <div className="px-4 py-3 flex items-center justify-between">
            <button 
              className="md:hidden text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <FontAwesomeIcon icon={faBars} size="lg" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                {effectiveRole === 'student' 
                  ? 'Student Portal' 
                  : effectiveRole === 'teacher' 
                    ? 'Teacher Portal' 
                    : 'Admin Portal'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  className="text-gray-600 hover:text-gray-800"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <FontAwesomeIcon icon={faBell} size="lg" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="py-2 px-4 bg-gray-100 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-xs text-blue-600">
                            {unreadCount} Unread
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {notifications.length > 0 ? (
                        <div>
                          {notifications.map(notification => (
                            <div
                              key={notification._id}
                              className={`px-4 py-3 border-b hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                              onClick={() => handleMarkRead(notification._id)}
                            >
                              <p className="text-sm text-gray-800">{notification.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-center text-gray-500">
                          No notifications
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Link to="/profile" className="text-gray-600 hover:text-gray-800">
                <FontAwesomeIcon icon={faUser} size="lg" />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;