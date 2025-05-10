import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart
} from 'recharts';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('charts');

  const API_URL = 'http://localhost:4000/api';

  // Define chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/analytics`);
        setAnalytics(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  // Prepare data for the user activity line chart
  const userActivityData = analytics?.userActivity?.map(activity => ({
    date: activity._id,
    activeUsers: activity.count
  })) || [];

  // Prepare data for the quiz completion bar chart
  const quizCompletionData = analytics?.quizCompletion?.map(quiz => ({
    name: quiz.title.length > 20 ? quiz.title.substring(0, 20) + '...' : quiz.title,
    attempts: quiz.totalAttempts,
    avgScore: Math.round(quiz.averageScore)
  })) || [];

  // Prepare data for the subject performance pie chart
  const subjectPerformanceData = analytics?.subjectPerformance?.map(subject => ({
    name: subject._id,
    value: subject.totalAttempts
  })) || [];

  // Prepare data for the subject performance radar chart
  const subjectScoreData = analytics?.subjectPerformance?.map(subject => ({
    subject: subject._id,
    score: Math.round(subject.averageScore)
  })) || [];

  // Prepare data for the composite chart
  const composedChartData = analytics?.subjectPerformance?.map(subject => ({
    name: subject._id,
    attempts: subject.totalAttempts,
    score: Math.round(subject.averageScore)
  })) || [];

  return (
    <DashboardLayout role="admin">
      <h2>Analytics</h2>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Detailed Analytics</h1>
          <div className="flex bg-white rounded-lg shadow-sm">
            <button
              onClick={() => setActiveTab('charts')}
              className={`px-4 py-2 ${activeTab === 'charts' 
                ? 'bg-blue-600 text-white rounded-l-lg' 
                : 'text-gray-600'}`}
            >
              Charts
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 ${activeTab === 'tables' 
                ? 'bg-blue-600 text-white rounded-r-lg' 
                : 'text-gray-600'}`}
            >
              Tables
            </button>
          </div>
        </div>

        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* User Activity Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">User Activity (Last 30 Days)</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={userActivityData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 75 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end" 
                      tick={{ fontSize: 12 }}
                      height={70}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} users`, 'Active Users']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="activeUsers" 
                      name="Active Users" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quiz Completion Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Quiz Completion Rates</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={quizCompletionData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 75 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="attempts" 
                      name="Total Attempts" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      dataKey="avgScore" 
                      name="Average Score (%)" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Performance Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Subject Attempts Distribution</h2>
              <div className="h-80 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectPerformanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {subjectPerformanceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [`${value} attempts`, props.payload.name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Performance Radar Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Subject Average Scores</h2>
              <div className="h-80 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectScoreData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar 
                      name="Average Score" 
                      dataKey="score" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6} 
                    />
                    <Tooltip formatter={(value) => [`${value}%`, 'Average Score']} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Composite Chart - Subject Performance Analysis */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Subject Performance Analysis</h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={composedChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 75 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="attempts" 
                      name="Total Attempts" 
                      fill="#8884d8" 
                      barSize={60}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="score" 
                      name="Average Score (%)" 
                      stroke="#82ca9d" 
                      strokeWidth={3}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* User Activity */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">User Activity (Last 30 Days)</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Active Users</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.userActivity?.map((activity) => (
                    <tr key={activity._id} className="border-b">
                      <td className="p-3">{activity._id}</td>
                      <td className="p-3">{activity.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quiz Completion */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Quiz Completion Rates</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 text-left">Quiz Title</th>
                    <th className="p-3 text-left">Total Attempts</th>
                    <th className="p-3 text-left">Average Score</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.quizCompletion?.map((quiz) => (
                    <tr key={quiz._id} className="border-b">
                      <td className="p-3">{quiz.title}</td>
                      <td className="p-3">{quiz.totalAttempts}</td>
                      <td className="p-3">{Math.round(quiz.averageScore)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subject Performance */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Subject Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-left">Total Attempts</th>
                    <th className="p-3 text-left">Average Score</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.subjectPerformance?.map((subject) => (
                    <tr key={subject._id} className="border-b">
                      <td className="p-3">{subject._id}</td>
                      <td className="p-3">{subject.totalAttempts}</td>
                      <td className="p-3">{Math.round(subject.averageScore)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;