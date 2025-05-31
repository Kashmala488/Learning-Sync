import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faChartBar, faCog, faShieldAlt, faFlag } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import api from '../../utils/api';

const AdminDashboard = ({ user }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/admin/reports');
      setMetrics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/admin/security-alerts');
      setAlerts(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch security alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsViewed = async (alertId) => {
    try {
      await api.put(`/admin/security-alerts/${alertId}/view`);
      setAlerts(alerts.map(alert => 
        alert._id === alertId 
          ? { ...alert, viewed: true, viewedAt: new Date() }
          : alert
      ));
    } catch (err) {
      console.error('Failed to mark alert as viewed:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  const unviewedAlerts = alerts.filter(alert => !alert.viewed);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{metrics?.totalUsers || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Average Quiz Score</h3>
            <p className="text-3xl font-bold text-green-600">
              {metrics?.averageQuizScore ? `${Math.round(metrics.averageQuizScore)}%` : 'N/A'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Active Users (30 days)</h3>
            <p className="text-3xl font-bold text-purple-600">{metrics?.activeUsers || 0}</p>
          </div>
        </div>

        {/* Security Alerts Section */}
        {unviewedAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-red-700 flex items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
              New Security Alerts ({unviewedAlerts.length})
            </h2>
            <div className="space-y-4">
              {unviewedAlerts.map((alert) => (
                <div 
                  key={alert._id}
                  className="bg-white p-4 rounded-lg shadow border border-red-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {alert.type}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-2">{alert.details}</p>
                      <p className="text-sm text-gray-500">
                        User: {alert.userEmail} | IP: {alert.ipAddress}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarkAsViewed(alert._id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Mark as Viewed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/admin/users"
              className="flex items-center p-4 bg-blue-100 rounded-lg hover:bg-blue-200"
            >
              <FontAwesomeIcon icon={faUsers} className="mr-3 text-blue-600" />
              Manage Users
            </Link>
            <Link
              to="/admin/moderation"
              className="flex items-center p-4 bg-red-100 rounded-lg hover:bg-red-200"
            >
              <FontAwesomeIcon icon={faFlag} className="mr-3 text-red-600" />
              Content Moderation
            </Link>
            <Link
              to="/admin/settings"
              className="flex items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faCog} className="mr-3 text-gray-600" />
              System Settings
            </Link>
            <Link
              to="/admin/reports"
              className="flex items-center p-4 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <FontAwesomeIcon icon={faChartBar} className="mr-3 text-green-600" />
              View Reports
            </Link>
            <Link
              to="/admin/analytics"
              className="flex items-center p-4 bg-purple-100 rounded-lg hover:bg-purple-200"
            >
              <FontAwesomeIcon icon={faChartBar} className="mr-3 text-purple-600" />
              Detailed Analytics
            </Link>
            <Link
              to="/admin/security-alerts"
              className="flex items-center p-4 bg-yellow-100 rounded-lg hover:bg-yellow-200"
            >
              <FontAwesomeIcon icon={faShieldAlt} className="mr-3 text-yellow-600" />
              Security Alerts
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;