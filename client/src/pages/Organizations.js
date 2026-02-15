import React, { useState, useEffect } from 'react';
import { getOrganizations, createOrganization, updateOrganization, deleteOrganization } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButton from '../components/ExportButton';
import './Customers.css';

const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'customer',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    industry: '',
    employee_count: '',
    annual_revenue: '',
    parent_organization_id: '',
    department: '',
    notes: '',
    status: 'active'
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    let filtered = organizations;
    if (searchTerm) {
      filtered = filtered.filter(org => org.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (typeFilter) {
      filtered = filtered.filter(org => org.type === typeFilter);
    }
    setFilteredOrganizations(filtered);
  }, [searchTerm, typeFilter, organizations]);

  const loadOrganizations = async () => {
    try {
      const response = await getOrganizations();
      setOrganizations(response.data);
      setFilteredOrganizations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        await updateOrganization(editingOrg.id, formData);
      } else {
        await createOrganization(formData);
      }
      setShowModal(false);
      resetForm();
      loadOrganizations();
      alert('Organization saved successfully!');
    } catch (error) {
      alert('Error saving organization.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'customer',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      industry: '',
      employee_count: '',
      annual_revenue: '',
      parent_organization_id: '',
      department: '',
      notes: '',
      status: 'active'
    });
    setEditingOrg(null);
  };

  if (loading) return <div className="page-loading">Loading organizations...</div>;

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Contacts & Organizations</h1>
          <p className="page-subtitle">Manage business contacts and organizations</p>
        </div>
        <div className="header-actions">
          <ExportButton
            fileName="organizations"
            headers={['Name', 'Type', 'Email', 'Phone', 'Industry', 'Status']}
            rows={filteredOrganizations.map(o => [o.name || '', o.type || '', o.email || '', o.phone || '', o.industry || '', o.status || ''])}
            title="Organizations"
          />
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Add Organization
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search organizations..." />
        <FilterBar
          filters={[{
            key: 'type',
            label: 'Type',
            value: typeFilter,
            options: [
              { value: 'customer', label: 'Customer' },
              { value: 'supplier', label: 'Supplier' },
              { value: 'partner', label: 'Partner' },
              { value: 'vendor', label: 'Vendor' }
            ]
          }]}
          onFilterChange={(key, value) => setTypeFilter(value)}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Parent Org</th>
              <th>Department</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrganizations.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-state">No organizations found</td>
              </tr>
            ) : (
              filteredOrganizations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name} {org.child_count > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({org.child_count} children)</span>}</td>
                  <td><span className="status-badge">{org.type}</span></td>
                  <td>{org.parent_name || '-'}</td>
                  <td>{org.department || '-'}</td>
                  <td>{org.email || '-'}</td>
                  <td>{org.phone || '-'}</td>
                  <td>{org.industry || '-'}</td>
                  <td>
                    <span className={`status-badge status-${org.status}`}>
                      {org.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => { setEditingOrg(org); setFormData(org); setShowModal(true); }}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => { if(window.confirm('Delete?')) deleteOrganization(org.id).then(loadOrganizations); }}>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{editingOrg ? 'Edit Organization' : 'Add Organization'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="partner">Partner</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Website</label>
                <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Street Name</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Suburb</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Town</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Province</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input type="text" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Parent Organization</label>
                  <select value={formData.parent_organization_id} onChange={(e) => setFormData({ ...formData, parent_organization_id: e.target.value })}>
                    <option value="">None (Top Level)</option>
                    {organizations.filter(o => o.id !== editingOrg?.id).map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <small>Link as subsidiary or branch</small>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g., Finance, HR" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Industry</label>
                  <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingOrg ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
