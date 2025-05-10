import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:4000/api';

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/reports`);
        setReports(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">System Reports</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
              <p className="text-2xl font-bold text-blue-600">{reports?.totalUsers || 0}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Average Quiz Score</h3>
              <p className="text-2xl font-bold text-green-600">
                {reports?.averageQuizScore ? `${Math.round(reports.averageQuizScore)}%` : 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Active Users (Last 30 Days)</h3>
              <p className="text-2xl font-bold text-purple-600">{reports?.activeUsers || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;