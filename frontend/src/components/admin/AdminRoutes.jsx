import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from '../../pages/dashboards/AdminDashboard';
import UserManagement from './UserManagment';
import ContentModeration from './ContentModeration';
import SystemSettings from './SystemSettings';
import Reports from './Reports';
import Analytics from './Analytics';
import SecurityAlerts from './SecurityAlerts';

const AdminRoutes = () => {
  const { userRole } = useAuth();

  if (userRole !== 'admin') {
    return <Navigate to="/login" />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/moderation" element={<ContentModeration />} />
      <Route path="/settings" element={<SystemSettings />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/security-alerts" element={<SecurityAlerts />} />
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
};

export default AdminRoutes;