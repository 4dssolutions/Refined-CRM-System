import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors - don't redirect on 401 from login/forgot/reset endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/forgot-password') ||
      error.config?.url?.includes('/auth/reset-password');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Customers
export const getCustomers = () => api.get('/customers');
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Suppliers
export const getSuppliers = () => api.get('/suppliers');
export const createSupplier = (data) => api.post('/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);

// Products
export const getProducts = () => api.get('/products');
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// Orders
export const getOrders = () => api.get('/orders');
export const getOrder = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);


// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getDashboardActivity = () => api.get('/dashboard/activity');

// Leads
export const getLeads = () => api.get('/leads');
export const createLead = (data) => api.post('/leads', data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const getCurrentUser = () => api.get('/auth/me');
export const register = (data) => api.post('/auth/register', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword });

// Users
export const getUsers = () => api.get('/users');
export const getAssignableUsers = () => api.get('/users/assignable');
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const changePassword = (id, data) => {
  // Only send newPassword, admin doesn't need currentPassword
  return api.put(`/users/${id}/password`, { newPassword: data.newPassword });
};
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Tasks
export const getTasks = (params) => api.get('/tasks', { params });
export const getTask = (id) => api.get(`/tasks/${id}`);
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Projects
export const getProjects = (params) => api.get('/projects', { params });
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Meetings
export const getMeetings = (params) => api.get('/meetings', { params });
export const getMeeting = (id) => api.get(`/meetings/${id}`);
export const createMeeting = (data) => api.post('/meetings', data);
export const updateMeeting = (id, data) => api.put(`/meetings/${id}`, data);
export const addMeetingParticipant = (id, data) => api.post(`/meetings/${id}/participants`, data);
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`);

// Calendar
export const getCalendarEvents = (params) => api.get('/calendar', { params });
export const getCalendarEvent = (id) => api.get(`/calendar/${id}`);
export const createCalendarEvent = (data) => api.post('/calendar', data);
export const updateCalendarEvent = (id, data) => api.put(`/calendar/${id}`, data);
export const deleteCalendarEvent = (id) => api.delete(`/calendar/${id}`);

// Organizations
export const getOrganizations = (params) => api.get('/organizations', { params });
export const getOrganization = (id) => api.get(`/organizations/${id}`);
export const createOrganization = (data) => api.post('/organizations', data);
export const updateOrganization = (id, data) => api.put(`/organizations/${id}`, data);
export const deleteOrganization = (id) => api.delete(`/organizations/${id}`);

// Audit Logs
export const getAuditLogs = (params) => api.get('/audit', { params });

// Documents
export const getDocuments = (params) => api.get('/documents', { params });
export const getDocument = (id) => api.get(`/documents/${id}`);
export const createDocument = (data) => api.post('/documents', data);
export const updateDocument = (id, data) => api.put(`/documents/${id}`, data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// Emails
export const getEmails = (params) => api.get('/emails', { params });
export const getSmtpStatus = () => api.get('/emails/smtp/status');
export const sendExternalEmail = (data) => api.post('/emails/send-external', data);
export const getEmail = (id) => api.get(`/emails/${id}`);
export const sendEmail = (data) => api.post('/emails', data);
export const updateEmail = (id, data) => api.put(`/emails/${id}`, data);
export const deleteEmail = (id) => api.delete(`/emails/${id}`);
export const getAvailableRecipients = () => api.get('/emails/recipients/available');
export const getEmailStats = () => api.get('/emails/stats/summary');

// Chat
export const getChatRooms = () => api.get('/chat/rooms');
export const getChatUsers = () => api.get('/chat/users');
export const createDmRoom = (otherUserId) => api.post('/chat/rooms/dm', { other_user_id: otherUserId });
export const getChatMessages = (roomId, params) => api.get(`/chat/rooms/${roomId}/messages`, { params });
export const sendChatMessage = (roomId, message) => api.post(`/chat/rooms/${roomId}/messages`, { message });
export const sendChatMessageWithFile = (roomId, formData) =>
  api.post(`/chat/rooms/${roomId}/messages/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

// Branches
export const getBranches = () => api.get('/branches');
export const getBranch = (id) => api.get(`/branches/${id}`);
export const createBranch = (data) => api.post('/branches', data);
export const updateBranch = (id, data) => api.put(`/branches/${id}`, data);
export const deleteBranch = (id) => api.delete(`/branches/${id}`);

// User Permissions
export const getSections = () => api.get('/users/sections');
export const getUserPermissions = (userId) => api.get(`/users/${userId}/permissions`);
export const updateUserPermissions = (userId, permissions) => api.put(`/users/${userId}/permissions`, { permissions });

// Calls
export const getCalls = () => api.get('/calls');
export const getCall = (id) => api.get(`/calls/${id}`);
export const createCall = (data) => api.post('/calls', data);
export const updateCall = (id, data) => api.put(`/calls/${id}`, data);
export const deleteCall = (id) => api.delete(`/calls/${id}`);
export const createTaskFromCall = (callId, data) => api.post(`/calls/${callId}/task`, data);
export const createMeetingFromCall = (callId, data) => api.post(`/calls/${callId}/meeting`, data);
export const searchCallContacts = (q) => api.get('/calls/contacts/search', { params: { q } });

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const getNotificationUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

export default api;
