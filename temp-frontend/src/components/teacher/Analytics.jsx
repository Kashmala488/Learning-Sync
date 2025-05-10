import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../ui/LoadingSpinner';
import api from '../../utils/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    quizStats: [],
    engagementMetrics: [],
    studentCount: 0
  });

  const API_URL = 'http://localhost:4000/api';

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/teachers/analytics`);
      setAnalytics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>

        {/* Quiz Statistics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faChartBar} className="mr-2" />
            Quiz Statistics
          </h2>
          {analytics.quizStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Quiz</th>
                    <th className="p-2 text-left">Average Score</th>
                    <th className="p-2 text-left">Total Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.quizStats.map((stat, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{stat.quiz.title}</td>
                      <td className="p-2">{Math.round(stat.averageScore)}%</td>
                      <td className="p-2">{stat.totalAttempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No quiz statistics available</p>
          )}
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faChartBar} className="mr-2" />
            Engagement Metrics
          </h2>
          {analytics.engagementMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Student</th>
                    <th className="p-2 text-left">Quiz Completion Rate</th>
                    <th className="p-2 text-left">Resource Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.engagementMetrics.map((metric, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{metric.studentId?.name || 'Unknown'}</td>
                      <td className="p-2">{Math.round(metric.quizCompletionRate)}%</td>
                      <td className="p-2">{Math.round(metric.resourceCompletionRate)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No engagement metrics available</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;