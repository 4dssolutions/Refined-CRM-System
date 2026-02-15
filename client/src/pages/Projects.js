import React, { useState, useEffect } from 'react';
import { getProjects, createProject, updateProject, deleteProject, getUsers, getOrganizations } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import './Customers.css';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    start_date: '',
    end_date: '',
    budget: '',
    manager_id: '',
    organization_id: '',
    progress: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = projects;
    if (searchTerm) {
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, projects]);

  const loadData = async () => {
    try {
      const [projectsRes, usersRes, orgsRes] = await Promise.all([
        getProjects(),
        getUsers(),
        getOrganizations()
      ]);
      setProjects(projectsRes.data);
      setFilteredProjects(projectsRes.data);
      setUsers(usersRes.data);
      setOrganizations(orgsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await createProject(formData);
      }
      setShowModal(false);
      resetForm();
      loadData();
      alert('Project saved successfully!');
    } catch (error) {
      alert('Error saving project.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      start_date: '',
      end_date: '',
      budget: '',
      manager_id: '',
      organization_id: '',
      progress: 0
    });
    setEditingProject(null);
  };

  if (loading) return <div className="page-loading">Loading projects...</div>;

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">Manage and track project progress</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Add Project
        </button>
      </div>

      <div className="page-toolbar">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search projects..." />
        <FilterBar
          filters={[{
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: [
              { value: 'planning', label: 'Planning' },
              { value: 'active', label: 'Active' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' }
            ]
          }]}
          onFilterChange={(key, value) => setStatusFilter(value)}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Manager</th>
              <th>Organization</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">No projects found</td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.manager_name || '-'}</td>
                  <td>{project.organization_name || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${project.progress || 0}%`, height: '100%', background: '#3b82f6' }}></div>
                      </div>
                      <span>{project.progress || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${project.status}`}>
                      {project.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => { setEditingProject(project); setFormData({...project, start_date: project.start_date?.split('T')[0], end_date: project.end_date?.split('T')[0]}); setShowModal(true); }}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => { if(window.confirm('Delete?')) deleteProject(project.id).then(loadData); }}>
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
              <h2>{editingProject ? 'Edit Project' : 'Add Project'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
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
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Budget</label>
                  <input type="number" step="0.01" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Progress (%)</label>
                  <input type="number" min="0" max="100" value={formData.progress} onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Manager</label>
                  <select value={formData.manager_id} onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}>
                    <option value="">Select Manager</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Organization</label>
                  <select value={formData.organization_id} onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}>
                    <option value="">Select Organization</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingProject ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
