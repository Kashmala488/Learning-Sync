import React from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';

const UpcomingSessions = ({ sessions }) => {
  const handleJoinSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('jwt_token');
      await axios.post(
        `http://localhost:5000/api/groups/sessions/${sessionId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Joined session successfully!');
      // Redirect to video call page or open video call link
      window.location.href = `/video-call/${sessionId}`;
    } catch (err) {
      toast.error('Failed to join session');
      console.error(err);
    }
  };

  // Ensure sessions is an array
  const sessionsList = Array.isArray(sessions) ? sessions : [];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg"
    >
      <h2 className="text-xl font-semibold text-neutral mb-4">Upcoming Sessions</h2>
      <div className="space-y-4">
        {sessionsList.length > 0 ? (
          sessionsList.map((session) => (
            <motion.div
              key={session._id}
              whileHover={{ scale: 1.02 }}
              className="p-4 bg-light rounded-md border border-gray-200"
            >
              <h3 className="text-lg font-medium">{session.title}</h3>
              <p className="text-gray-600">{session.purpose}</p>
              <p className="text-sm text-gray-500">
                {new Date(session.startTime).toLocaleString()}
              </p>
              <button
                onClick={() => handleJoinSession(session._id)}
                className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
              >
                Join Session
              </button>
            </motion.div>
          ))
        ) : (
          <p className="text-gray-500">No upcoming sessions scheduled.</p>
        )}
      </div>
    </motion.div>
  );
};

export default UpcomingSessions;