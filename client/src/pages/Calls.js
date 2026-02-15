import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getCalls, createCall, updateCall, deleteCall,
  createTaskFromCall, createMeetingFromCall,
  searchCallContacts, getAssignableUsers
} from '../services/api';
import { formatDateTime } from '../utils/format';
import {
  FiPhone, FiPhoneCall, FiPhoneOff, FiPlus, FiEdit, FiTrash2, FiX,
  FiSearch, FiUser, FiClock, FiFileText, FiCheckSquare, FiCalendar,
  FiPhoneIncoming, FiPhoneOutgoing
} from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import ExportButton from '../components/ExportButton';
import './Calls.css';

const Calls = () => {
  const { user } = useContext(AuthContext);
  const [calls, setCalls] = useState([]);
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialer state
  const [showDialer, setShowDialer] = useState(false);
  const [dialerPhone, setDialerPhone] = useState('');
  const [dialerContactName, setDialerContactName] = useState('');
  const [dialerContactType, setDialerContactType] = useState('customer');
  const [dialerContactId, setDialerContactId] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [showContactResults, setShowContactResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Active call state
  const [activeCall, setActiveCall] = useState(null);
  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef(null);
  const [callNotes, setCallNotes] = useState('');

  // Call detail / log modal
  const [selectedCall, setSelectedCall] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editOutcome, setEditOutcome] = useState('');

  // Create task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskCallId, setTaskCallId] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '', assigned_to: '', priority: 'medium' });
  const [assignableUsers, setAssignableUsers] = useState([]);

  // Create meeting modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingCallId, setMeetingCallId] = useState(null);
  const [meetingForm, setMeetingForm] = useState({ title: '', description: '', start_time: '', end_time: '', location: '', meeting_type: 'internal' });

  // Manual log modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    contact_name: '', contact_phone: '', contact_type: 'customer',
    direction: 'outbound', outcome: 'connected', duration: 0, notes: '', started_at: ''
  });

  useEffect(() => {
    loadCalls();
    loadAssignableUsers();
  }, []);

  useEffect(() => {
    let filtered = calls;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        (c.contact_name || '').toLowerCase().includes(term) ||
        (c.contact_phone || '').toLowerCase().includes(term) ||
        (c.notes || '').toLowerCase().includes(term) ||
        (c.outcome || '').toLowerCase().includes(term)
      );
    }
    setFilteredCalls(filtered);
  }, [searchTerm, calls]);

  const loadCalls = async () => {
    try {
      const res = await getCalls();
      setCalls(res.data);
      setFilteredCalls(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading calls:', err);
      setLoading(false);
    }
  };

  const loadAssignableUsers = async () => {
    try {
      const res = await getAssignableUsers();
      setAssignableUsers(res.data);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  // Contact search for dialer
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (contactSearch.trim().length < 2) {
      setContactResults([]);
      setShowContactResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchCallContacts(contactSearch.trim());
        setContactResults(res.data);
        setShowContactResults(true);
      } catch (err) {
        console.error('Contact search error:', err);
      }
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [contactSearch]);

  const selectContact = (contact) => {
    setDialerContactName(contact.name);
    setDialerPhone(contact.phone || '');
    setDialerContactType(contact.type);
    setDialerContactId(contact.id);
    setContactSearch(contact.name);
    setShowContactResults(false);
  };

  // Initiate an outbound call
  const handleStartCall = () => {
    if (!dialerPhone.trim()) {
      alert('Please enter a phone number');
      return;
    }

    // Open tel: link for actual dialing
    window.open(`tel:${dialerPhone.trim()}`, '_self');

    // Start tracking
    const now = new Date().toISOString();
    setActiveCall({
      contact_name: dialerContactName || 'Unknown',
      contact_phone: dialerPhone.trim(),
      contact_type: dialerContactType,
      contact_id: dialerContactId || null,
      started_at: now
    });
    setCallTimer(0);
    setCallNotes('');
    timerRef.current = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
    setShowDialer(false);
  };

  // End the active call and log it
  const handleEndCall = async (outcome = 'connected') => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await createCall({
        contact_name: activeCall.contact_name,
        contact_phone: activeCall.contact_phone,
        contact_type: activeCall.contact_type,
        contact_id: activeCall.contact_id,
        direction: 'outbound',
        status: 'completed',
        outcome,
        duration: callTimer,
        notes: callNotes || null,
        started_at: activeCall.started_at,
        ended_at: new Date().toISOString()
      });
      loadCalls();
    } catch (err) {
      console.error('Error logging call:', err);
    }

    setActiveCall(null);
    setCallTimer(0);
    setCallNotes('');
  };

  // Manual call log
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCall({
        ...logForm,
        started_at: logForm.started_at || new Date().toISOString()
      });
      setShowLogModal(false);
      setLogForm({ contact_name: '', contact_phone: '', contact_type: 'customer', direction: 'outbound', outcome: 'connected', duration: 0, notes: '', started_at: '' });
      loadCalls();
    } catch (err) {
      alert(err.response?.data?.error || 'Error logging call');
    }
  };

  // View call details
  const handleViewCall = (call) => {
    setSelectedCall(call);
    setEditNotes(call.notes || '');
    setEditOutcome(call.outcome || 'connected');
    setShowDetailModal(true);
  };

  const handleUpdateCall = async () => {
    try {
      await updateCall(selectedCall.id, { notes: editNotes, outcome: editOutcome });
      setShowDetailModal(false);
      loadCalls();
    } catch (err) {
      alert('Error updating call');
    }
  };

  const handleDeleteCall = async (id) => {
    if (!window.confirm('Delete this call record?')) return;
    try {
      await deleteCall(id);
      loadCalls();
    } catch (err) {
      alert('Error deleting call');
    }
  };

  // Create task from call
  const openTaskModal = (callId, call) => {
    setTaskCallId(callId);
    setTaskForm({
      title: `Follow-up: ${call.contact_name || call.contact_phone}`,
      description: `Follow-up from call with ${call.contact_name || call.contact_phone} on ${formatDateTime(call.started_at)}.\n\nCall notes: ${call.notes || 'None'}`,
      due_date: '',
      assigned_to: user?.id || '',
      priority: 'medium'
    });
    setShowTaskModal(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await createTaskFromCall(taskCallId, taskForm);
      setShowTaskModal(false);
      alert('Task created successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating task');
    }
  };

  // Create meeting from call
  const openMeetingModal = (callId, call) => {
    setMeetingCallId(callId);
    setMeetingForm({
      title: `Meeting: ${call.contact_name || call.contact_phone}`,
      description: `Follow-up meeting from call with ${call.contact_name || call.contact_phone}.\n\nCall notes: ${call.notes || 'None'}`,
      start_time: '',
      end_time: '',
      location: '',
      meeting_type: 'external'
    });
    setShowMeetingModal(true);
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      await createMeetingFromCall(meetingCallId, meetingForm);
      setShowMeetingModal(false);
      alert('Meeting scheduled successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating meeting');
    }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const exportHeaders = ['Date', 'Contact', 'Phone', 'Direction', 'Outcome', 'Duration', 'Notes'];
  const exportRows = filteredCalls.map(c => [
    formatDateTime(c.started_at),
    c.contact_name || '',
    c.contact_phone || '',
    c.direction || '',
    c.outcome || '',
    formatDuration(c.duration || 0),
    (c.notes || '').replace(/\n/g, ' ')
  ]);

  const outcomeColors = {
    connected: '#22c55e',
    voicemail: '#f59e0b',
    no_answer: '#ef4444',
    busy: '#f97316',
    wrong_number: '#6b7280',
    callback: '#3b82f6'
  };

  if (loading) return <div className="page-loading">Loading calls...</div>;

  return (
    <div className="calls-page">
      {/* Active Call Banner */}
      {activeCall && (
        <div className="active-call-banner">
          <div className="active-call-info">
            <FiPhoneCall className="active-call-icon pulse" />
            <div>
              <strong>{activeCall.contact_name || 'Unknown'}</strong>
              <span>{activeCall.contact_phone}</span>
            </div>
            <div className="call-timer">{formatDuration(callTimer)}</div>
          </div>
          <div className="active-call-notes">
            <textarea
              placeholder="Take notes during the call..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="active-call-actions">
            <button className="btn-success" onClick={() => handleEndCall('connected')}>
              <FiPhoneOff /> End Call - Connected
            </button>
            <button className="btn-secondary" onClick={() => handleEndCall('voicemail')}>
              Voicemail
            </button>
            <button className="btn-secondary" onClick={() => handleEndCall('no_answer')}>
              No Answer
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1><FiPhone /> Calls</h1>
          <p className="page-subtitle">Make calls, log activity, and create follow-ups</p>
        </div>
        <div className="header-actions">
          <ExportButton fileName="calls" headers={exportHeaders} rows={exportRows} title="Call Log" />
          <button className="btn-secondary" onClick={() => setShowLogModal(true)}>
            <FiFileText /> Log Call
          </button>
          <button className="btn-primary" onClick={() => { setShowDialer(true); setDialerPhone(''); setDialerContactName(''); setContactSearch(''); setDialerContactId(''); }}>
            <FiPhoneOutgoing /> New Call
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search calls by name, phone, notes..." />
      </div>

      <div className="calls-stats">
        <div className="call-stat">
          <span className="call-stat-value">{calls.length}</span>
          <span className="call-stat-label">Total Calls</span>
        </div>
        <div className="call-stat">
          <span className="call-stat-value">{calls.filter(c => c.outcome === 'connected').length}</span>
          <span className="call-stat-label">Connected</span>
        </div>
        <div className="call-stat">
          <span className="call-stat-value">{calls.filter(c => c.outcome === 'voicemail').length}</span>
          <span className="call-stat-label">Voicemail</span>
        </div>
        <div className="call-stat">
          <span className="call-stat-value">{calls.filter(c => c.outcome === 'no_answer').length}</span>
          <span className="call-stat-label">No Answer</span>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredCalls.length} of {calls.length} calls</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Direction</th>
              <th>Outcome</th>
              <th>Duration</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  {calls.length === 0 ? 'No calls logged yet. Make your first call!' : 'No calls match your search'}
                </td>
              </tr>
            ) : (
              filteredCalls.map((call) => (
                <tr key={call.id}>
                  <td>{formatDateTime(call.started_at)}</td>
                  <td>
                    <div className="call-contact">
                      <strong>{call.contact_name || 'Unknown'}</strong>
                      {call.contact_type && <span className="call-contact-type">{call.contact_type}</span>}
                    </div>
                  </td>
                  <td>
                    <a href={`tel:${call.contact_phone}`} className="call-phone-link">{call.contact_phone}</a>
                  </td>
                  <td>
                    <span className={`call-direction ${call.direction}`}>
                      {call.direction === 'inbound' ? <FiPhoneIncoming /> : <FiPhoneOutgoing />}
                      {call.direction}
                    </span>
                  </td>
                  <td>
                    <span className="call-outcome" style={{ backgroundColor: outcomeColors[call.outcome] || '#6b7280' }}>
                      {(call.outcome || 'unknown').replace('_', ' ')}
                    </span>
                  </td>
                  <td>{formatDuration(call.duration || 0)}</td>
                  <td className="call-notes-cell">{call.notes ? call.notes.substring(0, 50) + (call.notes.length > 50 ? '...' : '') : '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleViewCall(call)} title="View / Edit">
                        <FiEdit />
                      </button>
                      <button className="btn-icon" onClick={() => openTaskModal(call.id, call)} title="Create Task">
                        <FiCheckSquare />
                      </button>
                      <button className="btn-icon" onClick={() => openMeetingModal(call.id, call)} title="Schedule Meeting">
                        <FiCalendar />
                      </button>
                      <button className="btn-icon" onClick={() => { setDialerPhone(call.contact_phone); setDialerContactName(call.contact_name || ''); setDialerContactType(call.contact_type || 'customer'); setDialerContactId(call.contact_id || ''); setContactSearch(call.contact_name || ''); setShowDialer(true); }} title="Call Again">
                        <FiPhone />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => handleDeleteCall(call.id)} title="Delete">
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

      {/* Dialer Modal */}
      {showDialer && (
        <div className="modal-overlay" onClick={() => setShowDialer(false)}>
          <div className="modal-content dialer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiPhoneOutgoing /> Make a Call</h2>
              <button className="btn-icon" onClick={() => setShowDialer(false)}><FiX /></button>
            </div>
            <div className="dialer-body">
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Search Contact</label>
                <div className="dialer-search-wrap">
                  <FiSearch className="dialer-search-icon" />
                  <input
                    type="text"
                    placeholder="Search customers, suppliers..."
                    value={contactSearch}
                    onChange={(e) => { setContactSearch(e.target.value); setShowContactResults(true); }}
                    autoFocus
                  />
                </div>
                {showContactResults && contactResults.length > 0 && (
                  <div className="contact-results">
                    {contactResults.map((c) => (
                      <button key={`${c.type}-${c.id}`} className="contact-result-item" onClick={() => selectContact(c)}>
                        <FiUser />
                        <div>
                          <strong>{c.name}</strong>
                          <span>{c.phone || 'No phone'} - {c.type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    value={dialerContactName}
                    onChange={(e) => setDialerContactName(e.target.value)}
                    placeholder="Enter name"
                  />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={dialerContactType} onChange={(e) => setDialerContactType(e.target.value)}>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="organization">Organization</option>
                    <option value="lead">Lead</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={dialerPhone}
                  onChange={(e) => setDialerPhone(e.target.value)}
                  placeholder="e.g. +27 11 123 4567"
                  className="dialer-phone-input"
                />
              </div>
              <button
                className="btn-primary dialer-call-btn"
                onClick={handleStartCall}
                disabled={!dialerPhone.trim()}
              >
                <FiPhoneCall /> Call Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Detail Modal */}
      {showDetailModal && selectedCall && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Call Details</h2>
              <button className="btn-icon" onClick={() => setShowDetailModal(false)}><FiX /></button>
            </div>
            <div className="call-detail-body">
              <div className="call-detail-row">
                <strong>Contact:</strong> {selectedCall.contact_name || 'Unknown'}
              </div>
              <div className="call-detail-row">
                <strong>Phone:</strong> <a href={`tel:${selectedCall.contact_phone}`}>{selectedCall.contact_phone}</a>
              </div>
              <div className="call-detail-row">
                <strong>Date:</strong> {formatDateTime(selectedCall.started_at)}
              </div>
              <div className="call-detail-row">
                <strong>Duration:</strong> {formatDuration(selectedCall.duration || 0)}
              </div>
              <div className="call-detail-row">
                <strong>Direction:</strong> {selectedCall.direction}
              </div>
              <div className="call-detail-row">
                <strong>Called by:</strong> {selectedCall.caller_name || '-'}
              </div>
              <div className="form-group">
                <label>Outcome</label>
                <select value={editOutcome} onChange={(e) => setEditOutcome(e.target.value)}>
                  <option value="connected">Connected</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="wrong_number">Wrong Number</option>
                  <option value="callback">Callback Requested</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={5} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Add call notes..." />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => openTaskModal(selectedCall.id, selectedCall)}>
                  <FiCheckSquare /> Create Task
                </button>
                <button className="btn-secondary" onClick={() => openMeetingModal(selectedCall.id, selectedCall)}>
                  <FiCalendar /> Schedule Meeting
                </button>
                <button className="btn-primary" onClick={handleUpdateCall}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><FiFileText /> Log a Call</h2>
              <button className="btn-icon" onClick={() => setShowLogModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleLogSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input type="text" value={logForm.contact_name} onChange={(e) => setLogForm({ ...logForm, contact_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input type="tel" required value={logForm.contact_phone} onChange={(e) => setLogForm({ ...logForm, contact_phone: e.target.value })} placeholder="+27..." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Direction</label>
                  <select value={logForm.direction} onChange={(e) => setLogForm({ ...logForm, direction: e.target.value })}>
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Outcome</label>
                  <select value={logForm.outcome} onChange={(e) => setLogForm({ ...logForm, outcome: e.target.value })}>
                    <option value="connected">Connected</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="no_answer">No Answer</option>
                    <option value="busy">Busy</option>
                    <option value="wrong_number">Wrong Number</option>
                    <option value="callback">Callback Requested</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (seconds)</label>
                  <input type="number" min="0" value={logForm.duration} onChange={(e) => setLogForm({ ...logForm, duration: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Contact Type</label>
                  <select value={logForm.contact_type} onChange={(e) => setLogForm({ ...logForm, contact_type: e.target.value })}>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="organization">Organization</option>
                    <option value="lead">Lead</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Date & Time</label>
                <input type="datetime-local" value={logForm.started_at} onChange={(e) => setLogForm({ ...logForm, started_at: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={4} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} placeholder="Call notes..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowLogModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Log Call</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><FiCheckSquare /> Create Follow-up Task</h2>
              <button className="btn-icon" onClick={() => setShowTaskModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleCreateTask} className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input type="text" required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                  <option value="">Select user...</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showMeetingModal && (
        <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><FiCalendar /> Schedule Follow-up Meeting</h2>
              <button className="btn-icon" onClick={() => setShowMeetingModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleCreateMeeting} className="modal-form">
              <div className="form-group">
                <label>Title *</label>
                <input type="text" required value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={meetingForm.description} onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input type="datetime-local" required value={meetingForm.start_time} onChange={(e) => setMeetingForm({ ...meetingForm, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Time *</label>
                  <input type="datetime-local" required value={meetingForm.end_time} onChange={(e) => setMeetingForm({ ...meetingForm, end_time: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} placeholder="Office, Zoom, etc." />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={meetingForm.meeting_type} onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}>
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                    <option value="call">Call</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowMeetingModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Schedule Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calls;
