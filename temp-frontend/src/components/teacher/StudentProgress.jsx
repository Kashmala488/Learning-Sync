import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faBook, faTasks } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../ui/LoadingSpinner';
import api from '../../utils/api';

const StudentProgress = () => {
  const { studentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  const API_URL = 'http://localhost:4000/api';

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/teachers/track/${studentId}`);
      setProgress(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch student progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [studentId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Student Progress: {progress?.studentId?.name}</h1>

        {/* Quiz Results */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faChartLine} className="mr-2" />
            Quiz Results
          </h2>
          {progress.quizResults?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Quiz</th>
                    <th className="p-2 text-left">Score</th>
                    <th className="p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.quizResults.map((result, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{result.quizId?.title || 'Unknown Quiz'}</td>
                      <td className="p-2">{result.score}%</td>
                      <td className="p-2">{new Date(result.completedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No quiz results available</p>
          )}
        </div>

        {/* Resource Engagement */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faBook} className="mr-2" />
            Resource Engagement
          </h2>
          {progress.resourceEngagement?.length > 0 ? (
            <div className="space-y-4">
              {progress.resourceEngagement.map((engagement, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                  <h3 className="font-semibold text-gray-800">{engagement.resourceId?.title || 'Unknown Resource'}</h3>
                  <p className="text-sm text-gray-600">
                    Status: {engagement.completed ? 'Completed' : 'In Progress'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No resources assigned</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentProgress;