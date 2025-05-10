import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const SystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/api/admin/settings');
        setSettings(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch settings');
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/api/admin/settings', settings);
      setSettings(response.data);
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">System Settings</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Quiz Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maximum Quiz Questions
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings?.maxQuizQuestions || 10}
                onChange={(e) => setSettings({
                  ...settings,
                  maxQuizQuestions: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                Difficulty Distribution
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">Easy (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings?.quizDifficulty?.easy * 100 || 30}
                    onChange={(e) => setSettings({
                      ...settings,
                      quizDifficulty: {
                        ...settings.quizDifficulty,
                        easy: parseInt(e.target.value) / 100
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Medium (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings?.quizDifficulty?.medium * 100 || 50}
                    onChange={(e) => setSettings({
                      ...settings,
                      quizDifficulty: {
                        ...settings.quizDifficulty,
                        medium: parseInt(e.target.value) / 100
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Hard (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings?.quizDifficulty?.hard * 100 || 20}
                    onChange={(e) => setSettings({
                      ...settings,
                      quizDifficulty: {
                        ...settings.quizDifficulty,
                        hard: parseInt(e.target.value) / 100
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default SystemSettings;