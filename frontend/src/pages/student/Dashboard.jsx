import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const API_URL = 'http://localhost:4000';

const Dashboard = () => {
  const { token, currentUser } = useAuth();
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJoinedGroups = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/groups/joined`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJoinedGroups(response.data);
      } catch (err) {
        console.error('Error fetching joined groups:', err);
        setError('Failed to load your groups');
        toast.error('Failed to load your groups');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchJoinedGroups();
    }
  }, [token]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">My Learning Groups</h2>
      {joinedGroups.length === 0 ? (
        <p className="text-gray-600">You haven't joined any groups yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {joinedGroups.map(group => (
            <div key={group._id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold">{group.name}</h3>
              <p className="text-gray-600 mt-2">{group.description}</p>
              <div className="mt-3">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {group.subject}
                </span>
              </div>
              {group.mentor && (
                <p className="mt-2 text-sm text-gray-600">
                  Mentor: {group.mentor.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
