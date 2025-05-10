import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faPlus } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';
import api from '../../utils/api';

const LearningPaths = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [title, setTitle] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [resources, setResources] = useState([{ resourceId: '', title: '' }]);
  const [quizzes, setQuizzes] = useState([{ quizId: '', title: '' }]);
  const [success, setSuccess] = useState(null);

  const API_URL = 'http://localhost:4000/api';

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${API_URL}/teachers/students/progress`);
      console.log('Students response:', response.data);
      setStudents(response.data);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.error || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = () => {
    setResources([...resources, { resourceId: '', title: '' }]);
  };

  const handleAddQuiz = () => {
    setQuizzes([...quizzes, { quizId: '', title: '' }]);
  };

  const handleResourceChange = (index, field, value) => {
    const newResources = [...resources];
    newResources[index][field] = value;
    setResources(newResources);
  };

  const handleQuizChange = (index, field, value) => {
    const newQuizzes = [...quizzes];
    newQuizzes[index][field] = value;
    setQuizzes(newQuizzes);
  };

  const handleCreateLearningPath = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post(`${API_URL}/teachers/learning-path`, {
        studentId: selectedStudent,
        title,
        resources,
        quizzes
      });
      setSuccess('Learning path created successfully');
      setTitle('');
      setSelectedStudent('');
      setResources([{ resourceId: '', title: '' }]);
      setQuizzes([{ quizId: '', title: '' }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create learning path');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Create Learning Path</h1>

        {success && <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">{success}</div>}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Create New Learning Path
          </h2>
          <form onSubmit={handleCreateLearningPath}>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Select Student</label>
              {students.length > 0 ? (
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select a student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-600">No students available. Please assign students to your classes.</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Learning Path Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Resources</label>
              {resources.map((resource, index) => (
                <div key={index} className="mb-2 flex space-x-2">
                  <input
                    type="text"
                    value={resource.resourceId}
                    onChange={(e) => handleResourceChange(index, 'resourceId', e.target.value)}
                    placeholder="Resource ID"
                    className="w-1/2 p-2 border rounded"
                    required
                  />
                  <input
                    type="text"
                    value={resource.title}
                    onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                    placeholder="Resource Title"
                    className="w-1/2 p-2 border rounded"
                    required
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddResource}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Add Resource
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Quizzes</label>
              {quizzes.map((quiz, index) => (
                <div key={index} className="mb-2 flex space-x-2">
                  <input
                    type="text"
                    value={quiz.quizId}
                    onChange={(e) => handleQuizChange(index, 'quizId', e.target.value)}
                    placeholder="Quiz ID"
                    className="w-1/2 p-2 border rounded"
                    required
                  />
                  <input
                    type="text"
                    value={quiz.title}
                    onChange={(e) => handleQuizChange(index, 'title', e.target.value)}
                    placeholder="Quiz Title"
                    className="w-1/2 p-2 border rounded"
                    required
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddQuiz}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Add Quiz
              </button>
            </div>
            <button
              type="submit"
              disabled={students.length === 0 || !selectedStudent}
              className={`px-4 py-2 rounded text-white ${
                students.length === 0 || !selectedStudent ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Create Learning Path
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LearningPaths;