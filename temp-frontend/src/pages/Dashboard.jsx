import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboard from './dashboards/StudentDashboard';
import TeacherDashboard from './dashboards/TeacherDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../utils/api';

const Dashboard = () => {
  const { isAuthenticated, currentUser, userRole, loading } = useAuth();

  useEffect(() => {
    document.title = `Dashboard | Learning Platform`;

    const fetchData = async () => {
      if (!currentUser?._id) return;
      
      const effectiveRole = userRole || 'student';
      
      try {
        // Use role-specific endpoints to avoid permission issues
        let endpoint = `/api/dashboard/${currentUser._id}`;
        
        // Role-specific endpoints
        if (effectiveRole === 'student') {
          endpoint = '/api/students/dashboard';
        } else if (effectiveRole === 'teacher') {
          endpoint = '/api/teachers/dashboard';
        } else if (effectiveRole === 'admin') {
          endpoint = '/api/admin/dashboard';
        }
        
        const response = await api.get(endpoint);
        console.log('Dashboard data:', response.data);
        // Handle the response data
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error.response?.data || error.message);
      }
    };

    if (isAuthenticated && currentUser?._id) {
      fetchData();
    }
  }, [currentUser, isAuthenticated, userRole]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please log in to view the dashboard.</p>
      </div>
    );
  }

  const effectiveRole = userRole || 'student';
  
  switch (effectiveRole) {
    case 'teacher':
      return <TeacherDashboard user={currentUser} />;
    case 'admin':
      return <AdminDashboard user={currentUser} />;
    case 'student':
    default:
      return <StudentDashboard user={currentUser} />;
  }
};

export default Dashboard;