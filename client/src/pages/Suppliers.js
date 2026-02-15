import React, { useState, useEffect } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButton from '../components/ExportButton';
import './Customers.css';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    status: 'active'
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await getSuppliers();
      setSuppliers(response.data);
      setFilteredSuppliers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = suppliers;

    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }

    setFilteredSuppliers(filtered);
  }, [searchTerm, statusFilter, suppliers]);

  const exportHeaders = ['Name', 'Company', 'Email', 'Phone', 'Town', 'Status'];
  const exportRows = filteredSuppliers.map(s => [
    s.name || '', s.company || '', s.email || '', s.phone || '',
    s.state || '', s.status || ''
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      setShowModal(false);
      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error saving supplier. Please try again.');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      company: supplier.company || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip: supplier.zip || '',
      country: supplier.country || '',
      status: supplier.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteSupplier(id);
        loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Error deleting supplier. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      status: 'active'
    });
    setEditingSupplier(null);
  };

  if (loading) {
    return <div className="page-loading">Loading suppliers...</div>;
  }

  return (
    <div className="suppliers-page">
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="page-subtitle">Manage supplier relationships</p>
        </div>
        <div className="header-actions">
          <ExportButton fileName="suppliers" headers={exportHeaders} rows={exportRows} title="Suppliers" />
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Add Supplier
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search suppliers..."
        />
        <FilterBar
          filters={[{
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]
          }]}
          onFilterChange={(key, value) => setStatusFilter(value)}
        />
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredSuppliers.length} of {suppliers.length} suppliers</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Town</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  {suppliers.length === 0 ? 'No suppliers found' : 'No suppliers match your search'}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.company || '-'}</td>
                  <td>{supplier.email || '-'}</td>
                  <td>{supplier.phone || '-'}</td>
                  <td>{supplier.state || '-'}</td>
                  <td>
                    <span className={`status-badge status-${supplier.status}`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleEdit(supplier)}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(supplier.id)}>
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
              <h2>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
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
              <div className="form-group">
                <label>Street Name</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Suburb</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Town</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Province</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingSupplier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
