import React, { useState, useEffect } from 'react';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiX, FiCalendar } from 'react-icons/fi';
import './Customers.css';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'meeting',
    location: '',
    color: '#000000',
    all_day: false
  });

  useEffect(() => {
    loadEvents();
  }, [selectedDate]);

  const loadEvents = async () => {
    try {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString();
      const response = await getCalendarEvents({ start_date: start, end_date: end });
      setEvents(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading events:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, formData);
      } else {
        await createCalendarEvent(formData);
      }
      setShowModal(false);
      resetForm();
      loadEvents();
      alert('Event saved successfully!');
    } catch (error) {
      alert('Error saving event.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      event_type: 'meeting',
      location: '',
      color: '#3b82f6',
      all_day: false
    });
    setEditingEvent(null);
  };

  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  if (loading) return <div className="page-loading">Loading calendar...</div>;

  const days = getDaysInMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Calendar & Scheduling</h1>
          <p className="page-subtitle">View and manage your schedule</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Add Event
        </button>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <button className="btn-secondary" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}>
            ← Previous
          </button>
          <h2>{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}</h2>
          <button className="btn-secondary" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}>
            Next →
          </button>
        </div>

        <div className="calendar-grid">
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {days.map((date, index) => (
            <div key={index} className={`calendar-day ${date ? '' : 'empty'}`}>
              {date && (
                <>
                  <div className="calendar-day-number">{date.getDate()}</div>
                  <div className="calendar-events">
                    {getEventsForDate(date).slice(0, 3).map(event => (
                      <div key={event.id} className="calendar-event" style={{ backgroundColor: event.color }} onClick={() => { setEditingEvent(event); setFormData({...event, start_time: event.start_time?.replace(' ', 'T').slice(0, 16), end_time: event.end_time?.replace(' ', 'T').slice(0, 16)}); setShowModal(true); }}>
                        {event.title}
                      </div>
                    ))}
                    {getEventsForDate(date).length > 3 && (
                      <div className="calendar-event-more">+{getEventsForDate(date).length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input type="datetime-local" required value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Time *</label>
                  <input type="datetime-local" required value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}>
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <select value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}>
                    <option value="#000000">Black</option>
                    <option value="#333333">Dark Grey</option>
                    <option value="#666666">Grey</option>
                    <option value="#808080">Light Grey</option>
                    <option value="#999999">Very Light Grey</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingEvent ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
