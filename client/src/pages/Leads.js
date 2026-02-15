import React, { useState, useEffect } from 'react';
import { getLeads, createLead, updateLead, deleteLead, getAssignableUsers } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiX, FiTarget } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButton from '../components/ExportButton';
import { formatCurrency, formatDate } from '../utils/format';
import './Customers.css';
import './Leads.css';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiated', label: 'Negotiated' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Direct' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'other', label: 'Other' },
];

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'direct',
    status: 'new',
    priority: 'medium',
    notes: '',
    assigned_to: '',
    value: ''
  });

  useEffect(() => {
    loadLeads();
    loadUsers();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await getLeads();
      setLeads(response.data);
      setFilteredLeads(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading leads:', error);
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getAssignableUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    let filtered = leads;

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(lead => lead.priority === priorityFilter);
    }

    setFilteredLeads(filtered);
  }, [searchTerm, statusFilter, priorityFilter, leads]);

  const exportHeaders = ['Name', 'Company', 'Email', 'Phone', 'Source', 'Status', 'Priority', 'Value', 'Assigned to', 'Created'];
  const exportRows = filteredLeads.map(l => [
    l.name || '', l.company || '', l.email || '', l.phone || '',
    l.source || '', l.status || '', l.priority || '', (l.value != null ? formatCurrency(l.value) : ''),
    l.assigned_to_name || '', formatDate(l.created_at)
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        assigned_to: formData.assigned_to || null,
        value: formData.value === '' ? 0 : parseFloat(formData.value) || 0
      };
      if (editingLead) {
        await updateLead(editingLead.id, payload);
      } else {
        await createLead(payload);
      }
      setShowModal(false);
      resetForm();
      loadLeads();
      alert(editingLead ? 'Lead updated successfully!' : 'Lead created successfully!');
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Error saving lead. Please try again.');
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      source: lead.source || 'direct',
      status: lead.status || 'new',
      priority: lead.priority || 'medium',
      notes: lead.notes || '',
      assigned_to: lead.assigned_to || '',
      value: lead.value != null ? lead.value : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await deleteLead(id);
        loadLeads();
      } catch (error) {
        console.error('Error deleting lead:', error);
        alert('Error deleting lead. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'direct',
      status: 'new',
      priority: 'medium',
      notes: '',
      assigned_to: '',
      value: ''
    });
    setEditingLead(null);
  };

  if (loading) {
    return <div className="page-loading">Loading leads...</div>;
  }

  return (
    <div className="leads-page">
      <div className="page-header">
        <div>
          <h1><FiTarget className="page-title-icon" /> Leads</h1>
          <p className="page-subtitle">Manage and track your sales leads</p>
        </div>
        <div className="header-actions">
          <ExportButton fileName="leads" headers={exportHeaders} rows={exportRows} title="Leads" />
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Add Lead
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search leads..."
        />
        <FilterBar
          filters={[
            { key: 'status', label: 'Status', value: statusFilter, options: STATUS_OPTIONS },
            { key: 'priority', label: 'Priority', value: priorityFilter, options: PRIORITY_OPTIONS }
          ]}
          onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value);
          if (key === 'priority') setPriorityFilter(value);
        }}
        />
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredLeads.length} of {leads.length} leads</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Value</th>
              <th>Assigned to</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-state">
                  {leads.length === 0 ? 'No leads found. Add your first lead.' : 'No leads match your search'}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>{lead.company || '—'}</td>
                  <td>{lead.email || '—'}</td>
                  <td>
                    <span className={`status-badge status-${lead.status || 'new'}`}>
                      {lead.status || 'new'}
                    </span>
                  </td>
                  <td>{lead.priority || '—'}</td>
                  <td>{lead.value != null ? formatCurrency(lead.value) : '—'}</td>
                  <td>{lead.assigned_to_name || '—'}</td>
                  <td>{formatDate(lead.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleEdit(lead)}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(lead.id)}>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLead ? 'Edit Lead' : 'Add Lead'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    {SOURCE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Assigned to</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes about this lead..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingLead ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
