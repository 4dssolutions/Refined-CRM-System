import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getChatRooms,
  getChatUsers,
  createDmRoom,
  getChatMessages,
  sendChatMessage,
  sendChatMessageWithFile
} from '../services/api';
import api from '../services/api';
import { FiMessageCircle, FiSend, FiPaperclip, FiUserPlus, FiX, FiDownload, FiSearch } from 'react-icons/fi';
import './Chat.css';

const Chat = () => {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadRooms();
    loadChatUsers();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages();
      pollRef.current = setInterval(loadMessages, 3000);
      return () => clearInterval(pollRef.current);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadRooms = async () => {
    try {
      const response = await getChatRooms();
      setRooms(response.data);
      if (response.data.length > 0 && !selectedRoom) {
        setSelectedRoom(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadChatUsers = async () => {
    try {
      const response = await getChatUsers();
      setChatUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;
    try {
      setLoading(true);
      const response = await getChatMessages(selectedRoom.id);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDm = async (otherUser) => {
    try {
      const response = await createDmRoom(otherUser.id);
      const room = response.data;
      setRooms((prev) => {
        const exists = prev.some((r) => r.id === room.id);
        if (exists) return prev;
        return [room, ...prev];
      });
      setSelectedRoom(room);
      setShowUserPicker(false);
      setUserSearchTerm('');
    } catch (error) {
      console.error('Error starting DM:', error);
      alert(error.response?.data?.error || 'Failed to start conversation');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedRoom || sending) return;
    try {
      setSending(true);
      if (selectedFile) {
        const formData = new FormData();
        if (newMessage.trim()) formData.append('message', newMessage.trim());
        formData.append('file', selectedFile);
        const response = await sendChatMessageWithFile(selectedRoom.id, formData);
        setMessages((prev) => [...prev, response.data]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const response = await sendChatMessage(selectedRoom.id, newMessage.trim());
        setMessages((prev) => [...prev, response.data]);
      }
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      setSelectedFile(file);
    } else if (file) {
      alert('File must be 10MB or less');
    }
  };

  const handleDownloadAttachment = async (att) => {
    try {
      const response = await api.get(`/chat/attachments/${att.file_path}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', att.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const channelRooms = rooms.filter((r) => r.type === 'channel');
  const dmRooms = rooms.filter((r) => r.isDm || r.type === 'dm');

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1><FiMessageCircle /> Chat</h1>
      </div>

      <div className="chat-layout">
        <div className="chat-sidebar">
          <div className="chat-rooms-label">Channels</div>
          <div className="chat-rooms-list">
            {channelRooms.map((room) => (
              <button
                key={room.id}
                className={`chat-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                # {room.displayName || room.name}
              </button>
            ))}
          </div>
          <div className="chat-rooms-label">Direct Messages</div>
          <div className="chat-dm-actions">
            <button className="chat-new-dm-btn" onClick={() => setShowUserPicker(true)}>
              <FiUserPlus /> New conversation
            </button>
          </div>
          <div className="chat-rooms-list">
            {dmRooms.map((room) => (
              <button
                key={room.id}
                className={`chat-room-item dm ${selectedRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => setSelectedRoom(room)}
              >
                <span className="dm-avatar">{room.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
                {room.displayName || 'Unknown'}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-main">
          {selectedRoom ? (
            <>
              <div className="chat-room-header">
                <h2>
                  {selectedRoom.isDm ? (
                    <>
                      <span className="dm-avatar-sm">{selectedRoom.displayName?.charAt(0)?.toUpperCase() || '?'}</span>
                      {selectedRoom.displayName || selectedRoom.name}
                    </>
                  ) : (
                    `# ${selectedRoom.displayName || selectedRoom.name}`
                  )}
                </h2>
              </div>

              <div className="chat-messages">
                {loading && messages.length === 0 ? (
                  <div className="chat-loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty">
                    <FiMessageCircle />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`chat-message ${msg.user_id === user?.id ? 'own' : ''}`}
                    >
                      <div className="chat-message-avatar">
                        {msg.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="chat-message-content">
                        <div className="chat-message-meta">
                          <span className="chat-message-sender">{msg.user_name || 'Unknown'}</span>
                          <span className="chat-message-time">{formatTime(msg.created_at)}</span>
                        </div>
                        {msg.message && msg.message !== '(file)' && (
                          <div className="chat-message-text">{msg.message}</div>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="chat-attachments">
                            {msg.attachments.map((att) => (
                              <div key={att.id} className="chat-attachment">
                                <button
                                  type="button"
                                  className="chat-attachment-link"
                                  onClick={() => handleDownloadAttachment(att)}
                                >
                                  <FiDownload /> {att.file_name} ({formatFileSize(att.file_size || 0)})
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-form" onSubmit={handleSend}>
                {selectedFile && (
                  <div className="chat-file-preview">
                    <span>{selectedFile.name}</span>
                    <button
                      type="button"
                      className="chat-remove-file"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <FiX />
                    </button>
                  </div>
                )}
                <div className="chat-input-row">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                    className="chat-file-input"
                  />
                  <button
                    type="button"
                    className="chat-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                  >
                    <FiPaperclip />
                  </button>
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={(!newMessage.trim() && !selectedFile) || sending}
                    title="Send"
                  >
                    <FiSend />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="chat-placeholder">
              <FiMessageCircle />
              <p>Select a channel or start a conversation</p>
            </div>
          )}
        </div>
      </div>

      {showUserPicker && (
        <div className="modal-overlay" onClick={() => { setShowUserPicker(false); setUserSearchTerm(''); }}>
          <div className="modal-content chat-user-picker" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start a conversation</h2>
              <button className="btn-icon" onClick={() => { setShowUserPicker(false); setUserSearchTerm(''); }}>
                <FiX />
              </button>
            </div>
            <p style={{ padding: '0 1.5rem', margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Showing users from your branch</p>
            <div className="chat-user-search">
              <FiSearch />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="chat-user-list">
              {(() => {
                const filtered = chatUsers
                  .filter((u) => u.id !== user?.id)
                  .filter((u) => {
                    const term = userSearchTerm.toLowerCase().trim();
                    if (!term) return true;
                    const name = (u.name || '').toLowerCase();
                    const email = (u.email || '').toLowerCase();
                    return name.includes(term) || email.includes(term);
                  });
                return filtered.length > 0 ? (
                  filtered.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="chat-user-item"
                      onClick={() => handleStartDm(u)}
                    >
                      <span className="chat-user-avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      <div className="chat-user-info">
                        <span className="chat-user-name">{u.name}</span>
                        <span className="chat-user-email">{u.email}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="chat-user-empty">No users match your search</div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
