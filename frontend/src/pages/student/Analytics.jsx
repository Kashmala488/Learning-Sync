import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

// API base URL
const API_URL = 'http://localhost:4000';

const Analytics = () => {
  const { userRole } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [moodData, setMoodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('performance');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Fetch student performance analytics
        const analyticsResponse = await axios.get(`${API_URL}/api/students/analytics`);
        setAnalytics(analyticsResponse.data);
        
        // Fetch mood tracking data
        const moodResponse = await axios.get(`${API_URL}/api/students/mood`);
        setMoodData(moodResponse.data);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Helper function to generate quiz performance chart data
  const generateQuizPerformanceData = () => {
    if (!analytics || !analytics.quizAnalytics || !analytics.quizAnalytics.bySubject) {
      return [];
    }

    const subjects = Object.keys(analytics.quizAnalytics.bySubject);
    return subjects.map(subject => ({
      subject,
      avgScore: analytics.quizAnalytics.bySubject[subject].avgScore,
      count: analytics.quizAnalytics.bySubject[subject].count
    }));
  };

  // Helper function to generate learning path progress chart data
  const generatePathProgressData = () => {
    if (!analytics || !analytics.learningPathAnalytics) {
      return { completed: 0, active: 0, total: 0 };
    }

    const { completedPaths, activePaths, totalPaths } = analytics.learningPathAnalytics;
    return {
      completed: completedPaths,
      active: activePaths,
      total: totalPaths
    };
  };

  // Helper function to generate mood chart data from mood history
  const generateMoodChartData = () => {
    if (!moodData || !moodData.history || moodData.history.length === 0) {
      return [];
    }

    // Get last 7 entries or all if less than 7
    const recentEntries = moodData.history.slice(-7);
    
    return recentEntries.map(entry => ({
      date: new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: entry.mood,
      stress: entry.stress,
      energy: entry.energy
    }));
  };

  // Helper function to convert mood string to emoji
  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'happy': return '😀';
      case 'neutral': return '😐';
      case 'frustrated': return '😤';
      case 'confused': return '😕';
      case 'tired': return '😴';
      default: return '😐';
    }
  };

  if (loading) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <LoadingSpinner size="lg" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role={userRole || 'student'}>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={userRole || 'student'}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Learning Analytics</h2>
        <p className="text-gray-600">Track your progress and identify areas for improvement</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-t-lg shadow-md">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'performance'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setActiveTab('learning-paths')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'learning-paths'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Learning Paths
            </button>
            <button
              onClick={() => setActiveTab('mood-tracking')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'mood-tracking'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mood Tracking
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg shadow-md p-6">
        {/* Performance Analytics */}
        {activeTab === 'performance' && (
          <>
            {analytics && (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-500 text-sm font-medium mb-1">Average Quiz Score</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {Math.round(analytics.quizAnalytics.averageScore)}%
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-500 text-sm font-medium mb-1">Quizzes Completed</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {analytics.quizAnalytics.totalQuizzes}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-500 text-sm font-medium mb-1">Avg. Path Progress</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {Math.round(analytics.learningPathAnalytics.averageProgress)}%
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-yellow-500 text-sm font-medium mb-1">Learning Paths</div>
                    <div className="text-2xl font-bold text-gray-800">
                      {analytics.learningPathAnalytics.completedPaths} / {analytics.learningPathAnalytics.totalPaths} completed
                    </div>
                  </div>
                </div>
                
                {/* Subject Performance */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance by Subject</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {generateQuizPerformanceData().length > 0 ? (
                      <div className="space-y-4">
                        {generateQuizPerformanceData().map((subject, index) => (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-gray-700">{subject.subject}</span>
                              <span className="text-gray-600">{Math.round(subject.avgScore)}% ({subject.count} quizzes)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  subject.avgScore >= 80 ? 'bg-green-600' : 
                                  subject.avgScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${subject.avgScore}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No subject performance data available.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Performance by Difficulty */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance by Difficulty</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['easy', 'medium', 'hard'].map((difficulty) => {
                      const diffData = analytics.quizAnalytics.byDifficulty[difficulty];
                      const avgScore = Math.round(diffData.avgScore);
                      
                      return (
                        <div key={difficulty} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-700 capitalize">{difficulty}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              avgScore >= 80 ? 'bg-green-100 text-green-800' : 
                              avgScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {avgScore}% avg
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{diffData.count} quizzes taken</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Learning Paths Analytics */}
        {activeTab === 'learning-paths' && (
          <>
            {analytics && (
              <>
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Learning Path Progress</h3>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-700">Overall Completion</span>
                        <span className="text-gray-700 font-medium">
                          {analytics.learningPathAnalytics.completedPaths} / {analytics.learningPathAnalytics.totalPaths}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-blue-600 h-4 rounded-full"
                          style={{ 
                            width: `${(analytics.learningPathAnalytics.completedPaths / Math.max(1, analytics.learningPathAnalytics.totalPaths)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {analytics.learningPathAnalytics.totalPaths}
                        </div>
                        <div className="text-gray-600">Total Paths</div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-yellow-500 mb-2">
                          {analytics.learningPathAnalytics.activePaths}
                        </div>
                        <div className="text-gray-600">Active Paths</div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-green-500 mb-2">
                          {analytics.learningPathAnalytics.completedPaths}
                        </div>
                        <div className="text-gray-600">Completed Paths</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Learning Path Heatmap (simulated data visualization) */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Knowledge Gap Analysis</h3>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="grid grid-cols-3 gap-1">
                      {Object.keys(analytics.quizAnalytics.bySubject).map((subject, i) => {
                        const score = analytics.quizAnalytics.bySubject[subject].avgScore;
                        // Calculate knowledge strength as percentage (lower score = bigger gap)
                        const strength = Math.min(100, Math.max(0, score));
                        
                        return (
                          <div 
                            key={i} 
                            className="aspect-square flex items-center justify-center text-white text-xs font-medium"
                            style={{ 
                              backgroundColor: `rgba(${255 - (strength * 2.55)}, ${strength * 2.55}, 0, 1)`,
                              cursor: 'pointer'
                            }}
                            title={`${subject}: ${Math.round(score)}% mastery`}
                          >
                            {subject}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex justify-between mt-4">
                      <div className="text-xs text-gray-600">Low Mastery</div>
                      <div className="flex items-center">
                        <div className="w-24 h-2 bg-gradient-to-r from-red-500 to-green-500 rounded-full mr-2"></div>
                      </div>
                      <div className="text-xs text-gray-600">High Mastery</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Mood Tracking */}
        {activeTab === 'mood-tracking' && (
          <>
            {moodData ? (
              <>
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Mood</h3>
                  <p className="text-gray-600 mb-4">Your emotional state affects your learning experience</p>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center justify-center text-center mb-6">
                      <div className="bg-white p-6 rounded-full shadow-md">
                        <div className="text-6xl mb-2">{getMoodEmoji(moodData.mood)}</div>
                        <div className="text-gray-800 font-medium capitalize">{moodData.mood}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700">Stress Level</span>
                          <span className="text-gray-700 font-medium">{moodData.stress}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-red-500 h-3 rounded-full"
                            style={{ width: `${(moodData.stress / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700">Energy Level</span>
                          <span className="text-gray-700 font-medium">{moodData.energy}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full"
                            style={{ width: `${(moodData.energy / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mood History */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Mood History</h3>
                  
                  <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto">
                    {moodData.history && moodData.history.length > 0 ? (
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-7 gap-2">
                          {generateMoodChartData().map((entry, index) => (
                            <div key={index} className="text-center">
                              <div className="text-gray-500 text-xs mb-1">{entry.date}</div>
                              <div className="text-2xl mb-1">{getMoodEmoji(entry.mood)}</div>
                              <div className="h-20 flex flex-col justify-end space-y-1">
                                <div 
                                  className="bg-red-400 w-full rounded-sm" 
                                  style={{ height: `${entry.stress * 10}%` }}
                                  title={`Stress: ${entry.stress}/10`}
                                ></div>
                                <div 
                                  className="bg-green-400 w-full rounded-sm" 
                                  style={{ height: `${entry.energy * 10}%` }}
                                  title={`Energy: ${entry.energy}/10`}
                                ></div>
                              </div>
                              <div className="mt-2 flex text-xs">
                                <div className="w-1/2 text-red-500">S</div>
                                <div className="w-1/2 text-green-500">E</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No mood history data available.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <i className="fas fa-chart-line text-4xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Mood Data Available</h3>
                <p className="text-gray-600 mb-4">
                  Start tracking your mood to see trends and improve your learning experience.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;