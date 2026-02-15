import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getEmails, getEmail, sendEmail, updateEmail, deleteEmail,
  getAvailableRecipients, getEmailStats, getSmtpStatus, sendExternalEmail
} from '../services/api';
import {
  FiMail, FiSend, FiEdit, FiTrash2, FiStar, FiArchive,
  FiInbox, FiFolder, FiSearch, FiX, FiCornerUpLeft, FiPlus
} from 'react-icons/fi';
import './Emails.css';

const Emails = () => {
  const { user } = useContext(AuthContext);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [stats, setStats] = useState({ inbox: 0, sent: 0, drafts: 0, starred: 0 });
  const [availableRecipients, setAvailableRecipients] = useState([]);
  
  const [composeData, setComposeData] = useState({
    recipient_id: '',
    to_external: '',
    subject: '',
    body: '',
    parent_email_id: null
  });
  const [sendToExternal, setSendToExternal] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  useEffect(() => {
    loadEmails();
    loadStats();
    loadRecipients();
    getSmtpStatus().then(r => setSmtpConfigured(r.data.configured)).catch(() => setSmtpConfigured(false));
  }, [activeFolder, searchTerm]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const params = { folder: activeFolder };
      if (searchTerm) params.search = searchTerm;
      const response = await getEmails(params);
      setEmails(response.data);
    } catch (error) {
      console.error('Error loading emails:', error);
      alert('Error loading emails');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getEmailStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecipients = async () => {
    try {
      const response = await getAvailableRecipients();
      setAvailableRecipients(response.data);
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  };

  const handleEmailClick = async (emailId) => {
    try {
      const response = await getEmail(emailId);
      setSelectedEmail(response.data);
      loadStats(); // Refresh stats after reading
    } catch (error) {
      console.error('Error loading email:', error);
      alert('Error loading email');
    }
  };

  const handleCompose = () => {
    setComposeData({
      recipient_id: '',
      to_external: '',
      subject: '',
      body: '',
      parent_email_id: null
    });
    setSendToExternal(false);
    setShowCompose(true);
  };

  const handleReply = (email) => {
    setComposeData({
      recipient_id: email.sender_id,
      subject: `Re: ${email.subject}`,
      body: `\n\n--- Original Message ---\n${email.body}`,
      parent_email_id: email.id
    });
    setShowCompose(true);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    try {
      if (sendToExternal && composeData.to_external) {
        await sendExternalEmail({
          to_email: composeData.to_external,
          subject: composeData.subject,
          body: composeData.body
        });
      } else if (!sendToExternal && composeData.recipient_id) {
        await sendEmail(composeData);
      } else {
        alert(sendToExternal ? 'Enter recipient email address' : 'Select a recipient');
        return;
      }
      setShowCompose(false);
      setComposeData({ recipient_id: '', to_external: '', subject: '', body: '', parent_email_id: null });
      loadEmails();
      loadStats();
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert(error.response?.data?.error || 'Error sending email');
    }
  };

  const handleSaveDraft = async () => {
    try {
      await sendEmail({ ...composeData, save_as_draft: true });
      setShowCompose(false);
      setComposeData({ recipient_id: '', subject: '', body: '', parent_email_id: null });
      loadEmails();
      loadStats();
      alert('Draft saved!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error saving draft');
    }
  };

  const handleToggleStar = async (emailId, isStarred) => {
    try {
      await updateEmail(emailId, { is_starred: !isStarred });
      loadEmails();
      loadStats();
    } catch (error) {
      console.error('Error updating email:', error);
    }
  };

  const handleArchive = async (emailId) => {
    try {
      await updateEmail(emailId, { is_archived: true });
      loadEmails();
      loadStats();
    } catch (error) {
      console.error('Error archiving email:', error);
    }
  };

  const handleDelete = async (emailId) => {
    if (!window.confirm('Are you sure you want to delete this email?')) return;
    try {
      await deleteEmail(emailId);
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      loadEmails();
      loadStats();
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Error deleting email');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="emails-container">
      <div className="emails-header">
        <h1><FiMail /> Email</h1>
        <button className="btn-primary" onClick={handleCompose}>
          <FiPlus /> Compose
        </button>
      </div>

      <div className="emails-layout">
        <div className="emails-sidebar">
          <div className="folder-list">
            <button
              className={`folder-item ${activeFolder === 'inbox' ? 'active' : ''}`}
              onClick={() => { setActiveFolder('inbox'); setSelectedEmail(null); }}
            >
              <FiInbox /> Inbox {stats.inbox > 0 && <span className="badge">{stats.inbox}</span>}
            </button>
            <button
              className={`folder-item ${activeFolder === 'sent' ? 'active' : ''}`}
              onClick={() => { setActiveFolder('sent'); setSelectedEmail(null); }}
            >
              <FiSend /> Sent {stats.sent > 0 && <span className="badge">{stats.sent}</span>}
            </button>
            <button
              className={`folder-item ${activeFolder === 'draft' ? 'active' : ''}`}
              onClick={() => { setActiveFolder('draft'); setSelectedEmail(null); }}
            >
              <FiEdit /> Drafts {stats.drafts > 0 && <span className="badge">{stats.drafts}</span>}
            </button>
            <button
              className={`folder-item ${activeFolder === 'starred' ? 'active' : ''}`}
              onClick={() => { setActiveFolder('starred'); setSelectedEmail(null); }}
            >
              <FiStar /> Starred {stats.starred > 0 && <span className="badge">{stats.starred}</span>}
            </button>
            <button
              className={`folder-item ${activeFolder === 'archived' ? 'active' : ''}`}
              onClick={() => { setActiveFolder('archived'); setSelectedEmail(null); }}
            >
              <FiArchive /> Archived
            </button>
          </div>
        </div>

        <div className="emails-list-container">
          <div className="emails-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="emails-list">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : emails.length === 0 ? (
              <div className="empty-state">No emails in this folder</div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${!email.is_read && activeFolder === 'inbox' ? 'unread' : ''}`}
                  onClick={() => handleEmailClick(email.id)}
                >
                  <div className="email-item-header">
                    <div className="email-sender">
                      {activeFolder === 'inbox' ? email.sender_name : email.recipient_name}
                    </div>
                    <div className="email-date">{formatDate(email.created_at)}</div>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-preview">{email.body.substring(0, 100)}...</div>
                  <div className="email-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(email.id, email.is_starred);
                      }}
                      title={email.is_starred ? 'Unstar' : 'Star'}
                    >
                      <FiStar className={email.is_starred ? 'starred' : ''} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(email.id);
                      }}
                      title="Archive"
                    >
                      <FiArchive />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(email.id);
                      }}
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="email-view">
          {selectedEmail ? (
            <div className="email-content">
              <div className="email-content-header">
                <div>
                  <h2>{selectedEmail.subject}</h2>
                  <div className="email-meta">
                    <div className="email-from">
                      <strong>From:</strong> {selectedEmail.sender_name} ({selectedEmail.sender_email})
                    </div>
                    <div className="email-to">
                      <strong>To:</strong> {selectedEmail.recipient_name} ({selectedEmail.recipient_email})
                    </div>
                    <div className="email-date-full">
                      <strong>Date:</strong> {new Date(selectedEmail.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="email-actions-bar">
                  {activeFolder === 'inbox' && (
                    <button className="btn-secondary" onClick={() => handleReply(selectedEmail)}>
                      <FiCornerUpLeft /> Reply
                    </button>
                  )}
                  <button
                    className="btn-icon"
                    onClick={() => handleToggleStar(selectedEmail.id, selectedEmail.is_starred)}
                    title={selectedEmail.is_starred ? 'Unstar' : 'Star'}
                  >
                    <FiStar className={selectedEmail.is_starred ? 'starred' : ''} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleArchive(selectedEmail.id)}
                    title="Archive"
                  >
                    <FiArchive />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(selectedEmail.id)}
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
              <div className="email-body">
                {selectedEmail.body.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="email-placeholder">
              <FiMail />
              <p>Select an email to view</p>
            </div>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal-content compose-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Compose Email</h2>
              <button className="btn-icon" onClick={() => setShowCompose(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="compose-form">
              {smtpConfigured && (
                <div className="form-group">
                  <label>Send to</label>
                  <div className="compose-recipient-type">
                    <label>
                      <input
                        type="radio"
                        checked={!sendToExternal}
                        onChange={() => setSendToExternal(false)}
                      />
                      CRM User
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={sendToExternal}
                        onChange={() => setSendToExternal(true)}
                      />
                      External Email
                    </label>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>To</label>
                {sendToExternal ? (
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={composeData.to_external}
                    onChange={(e) => setComposeData({ ...composeData, to_external: e.target.value })}
                    required={sendToExternal}
                  />
                ) : (
                  <>
                    <select
                      value={composeData.recipient_id}
                      onChange={(e) => setComposeData({ ...composeData, recipient_id: e.target.value })}
                      required={!sendToExternal}
                    >
                      <option value="">Select recipient...</option>
                      {availableRecipients.map((recipient) => (
                        <option key={recipient.id} value={recipient.id}>
                          {recipient.name} ({recipient.email}) - {recipient.role}
                        </option>
                      ))}
                    </select>
                    <small>Showing users from your branch</small>
                  </>
                )}
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  rows={10}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleSaveDraft}>
                  Save Draft
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCompose(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <FiSend /> Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Emails;
