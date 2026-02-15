import React, { useState, useEffect } from 'react';
import { getDocuments, createDocument, updateDocument, deleteDocument, getOrganizations, getProjects } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiX, FiDownload, FiFile } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import './Customers.css';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    file_path: '',
    file_type: '',
    file_size: '',
    organization_id: '',
    project_id: '',
    category: '',
    description: '',
    tags: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = documents;
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter(doc => doc.category === categoryFilter);
    }
    setFilteredDocuments(filtered);
  }, [searchTerm, categoryFilter, documents]);

  const loadData = async () => {
    try {
      const [docsRes, orgsRes, projsRes] = await Promise.all([
        getDocuments(),
        getOrganizations(),
        getProjects()
      ]);
      setDocuments(docsRes.data);
      setFilteredDocuments(docsRes.data);
      setOrganizations(orgsRes.data);
      setProjects(projsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDocument) {
        await updateDocument(editingDocument.id, formData);
      } else {
        await createDocument(formData);
      }
      setShowModal(false);
      resetForm();
      loadData();
      alert('Document saved successfully!');
    } catch (error) {
      alert('Error saving document.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        name: file.name,
        file_path: `/uploads/${file.name}`,
        file_type: file.type,
        file_size: file.size
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      file_path: '',
      file_type: '',
      file_size: '',
      organization_id: '',
      project_id: '',
      category: '',
      description: '',
      tags: ''
    });
    setEditingDocument(null);
  };

  if (loading) return <div className="page-loading">Loading documents...</div>;

  const categories = [...new Set(documents.map(d => d.category).filter(Boolean))];

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Document Management</h1>
          <p className="page-subtitle">Centralized repository for business documents</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Upload Document
        </button>
      </div>

      <div className="page-toolbar">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search documents..." />
        {categories.length > 0 && (
          <FilterBar
            filters={[{
              key: 'category',
              label: 'Category',
              value: categoryFilter,
              options: categories.map(cat => ({ value: cat, label: cat }))
            }]}
            onFilterChange={(key, value) => setCategoryFilter(value)}
          />
        )}
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredDocuments.length} of {documents.length} documents</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Organization</th>
              <th>Project</th>
              <th>Type</th>
              <th>Size</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">No documents found</td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiFile />
                      {doc.name}
                    </div>
                  </td>
                  <td>{doc.category || '-'}</td>
                  <td>{doc.organization_name || '-'}</td>
                  <td>{doc.project_name || '-'}</td>
                  <td>{doc.file_type || '-'}</td>
                  <td>{doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : '-'}</td>
                  <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => window.open(doc.file_path, '_blank')} title="Download">
                        <FiDownload />
                      </button>
                      <button className="btn-icon" onClick={() => { setEditingDocument(doc); setFormData(doc); setShowModal(true); }}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => { if(window.confirm('Delete?')) deleteDocument(doc.id).then(loadData); }}>
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
              <h2>{editingDocument ? 'Edit Document' : 'Upload Document'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>File *</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={!!editingDocument}
                />
                {editingDocument && <small>File cannot be changed after upload</small>}
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g., Contract, License, NDA" />
                </div>
                <div className="form-group">
                  <label>Tags</label>
                  <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="Comma-separated tags" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Organization</label>
                  <select value={formData.organization_id} onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}>
                    <option value="">Select Organization</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Project</label>
                  <select value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}>
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingDocument ? 'Update' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
