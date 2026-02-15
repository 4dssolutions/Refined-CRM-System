import React from 'react';
import Notification from './Notification';
import './Notification.css';

const NotificationContainer = ({ notifications, removeNotification }) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
