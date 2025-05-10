import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const SecurityAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:4000/api';

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/security-alerts`);
        setAlerts(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch security alerts');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const handleMarkAsResolved = async (alertId) => {
    try {
      await axios.put(`${API_URL}/admin/security-alerts/${alertId}/resolve`);
      setAlerts(alerts.map(alert => 
        alert._id === alertId 
          ? { ...alert, status: 'resolved', resolvedAt: new Date() }
          : alert
      ));
    } catch (err) {
      console.error('Failed to mark alert as resolved:', err);
    }
  };

  const handleMarkAsViewed = async (alertId) => {
    try {
      await axios.put(`${API_URL}/admin/security-alerts/${alertId}/view`);
      setAlerts(alerts.map(alert => 
        alert._id === alertId 
          ? { ...alert, viewed: true, viewedAt: new Date() }
          : alert
      ));
    } catch (err) {
      console.error('Failed to mark alert as viewed:', err);
    }
  };

  const getAlertStyle = (alert) => {
    if (alert.status === 'resolved') {
      return 'bg-green-50 border-green-200';
    }
    if (!alert.viewed) {
      return 'bg-red-50 border-red-200 animate-pulse';
    }
    return 'bg-yellow-50 border-yellow-200';
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  const unviewedCount = alerts.filter(alert => !alert.viewed).length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Security Alerts</h1>
          {unviewedCount > 0 && (
            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full">
              {unviewedCount} New Alert{unviewedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          {alerts.length === 0 ? (
            <p className="text-gray-600">No security alerts at this time.</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div 
                  key={alert._id} 
                  className={`p-4 rounded border transition-all duration-300 ${getAlertStyle(alert)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {!alert.viewed && (
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      )}
                      {alert.type}
                    </h3>
                    <div className="space-x-2">
                      {!alert.viewed && (
                        <button
                          onClick={() => handleMarkAsViewed(alert._id)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Mark as Viewed
                        </button>
                      )}
                      {alert.viewed && !alert.status && (
                        <button
                          onClick={() => handleMarkAsResolved(alert._id)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><strong>User:</strong> {alert.userEmail}</p>
                    <p><strong>IP Address:</strong> {alert.ipAddress}</p>
                    <p><strong>Timestamp:</strong> {new Date(alert.timestamp).toLocaleString()}</p>
                    <p><strong>Status:</strong> {alert.status || 'Pending'}</p>
                  </div>
                  <p className="mt-2"><strong>Details:</strong> {alert.details}</p>
                  {alert.resolvedAt && (
                    <p className="mt-2 text-sm text-green-600">
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                      Resolved on {new Date(alert.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SecurityAlerts;