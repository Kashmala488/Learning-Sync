import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faPlus } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';
import api from '../../utils/api';

const Resources = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
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

  const handleAssignResource = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post(`${API_URL}/teachers/assign`, {
        studentId: selectedStudent,
        title,
        content
      });
      setSuccess('Resource assigned successfully');
      setTitle('');
      setContent('');
      setSelectedStudent('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign resource');
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
        <h1 className="text-2xl font-bold text-gray-800">Assign Resources</h1>

        {success && <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">{success}</div>}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Assign New Resource
          </h2>
          <form onSubmit={handleAssignResource}>
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
              <label className="block text-gray-700 font-semibold mb-2">Resource Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Resource Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 border rounded"
                rows="5"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={students.length === 0 || !selectedStudent}
              className={`px-4 py-2 rounded text-white ${
                students.length === 0 || !selectedStudent ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Assign Resource
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Resources;