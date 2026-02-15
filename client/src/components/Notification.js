import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import './Notification.css';

const Notification = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose && onClose(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: FiCheckCircle,
    error: FiAlertCircle,
    warning: FiAlertTriangle,
    info: FiInfo
  };

  const Icon = icons[type] || FiInfo;

  if (!visible) return null;

  return (
    <div className={`notification notification-${type}`}>
      <Icon className="notification-icon" />
      <span className="notification-message">{message}</span>
      <button className="notification-close" onClick={() => {
        setVisible(false);
        setTimeout(() => onClose && onClose(), 300);
      }}>
        <FiX />
      </button>
    </div>
  );
};

export default Notification;
