import React, { useState, useEffect } from 'react';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, getAssignableUsers } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiX, FiCalendar, FiClock } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import './Customers.css';

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_type: 'internal',
    participant_ids: []
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = meetings;
    if (searchTerm) {
      filtered = filtered.filter(m => m.title?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredMeetings(filtered);
  }, [searchTerm, meetings]);

  const loadData = async () => {
    try {
      const [meetingsRes, usersRes] = await Promise.all([
        getMeetings(),
        getAssignableUsers()
      ]);
      setMeetings(meetingsRes.data);
      setFilteredMeetings(meetingsRes.data);
      setUsers(usersRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMeeting) {
        await updateMeeting(editingMeeting.id, formData);
      } else {
        await createMeeting(formData);
      }
      setShowModal(false);
      resetForm();
      loadData();
      alert('Meeting saved successfully!');
    } catch (error) {
      alert('Error saving meeting.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      meeting_type: 'internal',
      participant_ids: []
    });
    setEditingMeeting(null);
  };

  if (loading) return <div className="page-loading">Loading meetings...</div>;

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Meetings</h1>
          <p className="page-subtitle">Schedule and manage meetings</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Schedule Meeting
        </button>
      </div>

      <div className="page-toolbar">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search meetings..." />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date & Time</th>
              <th>Location</th>
              <th>Type</th>
              <th>Participants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeetings.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">No meetings found</td>
              </tr>
            ) : (
              filteredMeetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td>{meeting.title}</td>
                  <td>
                    <div><FiCalendar /> {new Date(meeting.start_time).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <FiClock /> {new Date(meeting.start_time).toLocaleTimeString()} - {new Date(meeting.end_time).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>{meeting.location || '-'}</td>
                  <td>{meeting.meeting_type}</td>
                  <td>{meeting.participant_count || 0}</td>
                  <td>
                    <span className={`status-badge status-${meeting.status}`}>
                      {meeting.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => { setEditingMeeting(meeting); setFormData({...meeting, start_time: meeting.start_time?.replace(' ', 'T').slice(0, 16), end_time: meeting.end_time?.replace(' ', 'T').slice(0, 16), participant_ids: meeting.participants?.map(p => p.user_id) || []}); setShowModal(true); }}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => { if(window.confirm('Delete?')) deleteMeeting(meeting.id).then(loadData); }}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}</h2>
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
                  <label>Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.meeting_type} onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}>
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Participants</label>
                <select multiple value={formData.participant_ids} onChange={(e) => setFormData({ ...formData, participant_ids: Array.from(e.target.selectedOptions, option => option.value) })} style={{ minHeight: '100px' }}>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <small>Hold Ctrl/Cmd to select multiple</small>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingMeeting ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
