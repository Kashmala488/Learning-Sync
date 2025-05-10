import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../utils/api';

const TeacherDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [dashboardData, setDashboardData] = useState({});

  const API_URL = 'http://localhost:4000/api';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/teachers/students/progress`);
      console.log('Students response:', response.data);
      setStudents(response.data);
      setDashboardData({ studentCount: response.data.length });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800">Students</h2>
            <p className="text-3xl font-bold text-blue-600">{dashboardData.studentCount || 0}</p>
            <Link to="/teacher/students" className="text-blue-600 hover:underline">
              View Students
            </Link>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800">Resources</h2>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <Link to="/teacher/resources" className="text-blue-600 hover:underline">
              Manage Resources
            </Link>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <Link to="/teacher/communication" className="text-blue-600 hover:underline">
              View Messages
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Student Progress</h2>
          {students.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="p-2">Name</th>
                  <th className="p-2">Progress</th>
                  <th className="p-2">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-t">
                    <td className="p-2">{student.name}</td>
                    <td className="p-2">{student.progress}%</td>
                    <td className="p-2">
                      {student.lastUpdated ? new Date(student.lastUpdated).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No student progress data available.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;