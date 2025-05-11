import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const Notifications = ({ notifications, onNotificationClick, onClose }) => (
  <div className="absolute top-4 right-4 w-64 bg-white shadow-lg rounded-lg p-4 z-50">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-bold">Notifications</h3>
      <button
        onClick={onClose}
        className="text-gray-600 hover:text-gray-800"
        aria-label="Close notifications"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
    {notifications.map((notification) => (
      <div
        key={notification._id}
        className="p-2 mb-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
        onClick={() => onNotificationClick(notification._id)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && onNotificationClick(notification._id)}
      >
        {notification.message || 'New video call notification'}
      </div>
    ))}
  </div>
);

export default Notifications;