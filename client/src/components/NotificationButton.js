import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/api';
import {
  FiBell,
  FiMail,
  FiMessageCircle,
  FiCheckSquare,
  FiClock,
  FiCalendar
} from 'react-icons/fi';
import './NotificationButton.css';

const typeIcons = {
  chat: FiMessageCircle,
  email: FiMail,
  task: FiCheckSquare,
  meeting: FiClock,
  calendar: FiCalendar
};

const NotificationButton = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const popupRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        getNotifications({ limit: 30 }),
        getNotificationUnreadCount()
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (n) => {
    await markNotificationRead(n.id);
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setIsOpen(false);
    navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-button-wrapper" ref={popupRef}>
      <button
        type="button"
        className="notification-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {isOpen && (
        <div className="notification-popup">
          <div className="notification-popup-header">
            <h3>Notifications</h3>
            {notifications.some((n) => !n.is_read) && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcons[n.type] || FiBell;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="notification-icon">
                      <Icon />
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{n.title}</div>
                      {n.message && (
                        <div className="notification-message">{n.message}</div>
                      )}
                      <div className="notification-time">{formatTime(n.created_at)}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationButton;
