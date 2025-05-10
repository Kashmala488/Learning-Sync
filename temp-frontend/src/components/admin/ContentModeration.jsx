import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';

const ContentModeration = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:4000/api';

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/moderate`);
        setQueue(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch moderation queue');
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, []);

  const handleModerate = async (quizId, questionIndex, action) => {
    try {
      await axios.post(`${API_URL}/admin/moderate/${quizId}`, { questionIndex, action });
      setQueue(
        queue.map((quiz) =>
          quiz.quizId === quizId
            ? {
                ...quiz,
                flaggedQuestions: quiz.flaggedQuestions.filter(
                  (fq) => fq.questionIndex !== questionIndex
                ),
              }
            : quiz
        ).filter((quiz) => quiz.flaggedQuestions.length > 0)
      );
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} question`);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Content Moderation</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          {queue.length === 0 ? (
            <p className="text-gray-600">No flagged content to moderate.</p>
          ) : (
            <div className="space-y-4">
              {queue.map((quiz) => (
                <div key={quiz.quizId} className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700">{quiz.title}</h3>
                  {quiz.flaggedQuestions.map((fq) => (
                    <div key={fq.questionIndex} className="mt-2 p-4 bg-gray-50 rounded">
                      <p><strong>Question:</strong> {fq.question}</p>
                      <p><strong>Reason:</strong> {fq.reason}</p>
                      <p><strong>Flagged by:</strong> {fq.userId?.name || 'Unknown'}</p>
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => handleModerate(quiz.quizId, fq.questionIndex, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerate(quiz.quizId, fq.questionIndex, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContentModeration;