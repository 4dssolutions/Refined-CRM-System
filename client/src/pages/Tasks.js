import React, { useState, useEffect, useContext } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getAssignableUsers, getProjects } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FiPlus, FiEdit, FiTrash2, FiX, FiCheck } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import './Customers.css';

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    project_id: '',
    assigned_to: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = tasks;
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    setFilteredTasks(filtered);
  }, [searchTerm, statusFilter, tasks]);

  const loadData = async () => {
    try {
      const [tasksRes, usersRes, projectsRes] = await Promise.all([
        getTasks(),
        getAssignableUsers(),
        getProjects()
      ]);
      setTasks(tasksRes.data);
      setFilteredTasks(tasksRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await updateTask(editingTask.id, formData);
      } else {
        await createTask(formData);
      }
      setShowModal(false);
      resetForm();
      loadData();
      alert('Task saved successfully!');
    } catch (error) {
      alert('Error saving task. Please try again.');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      project_id: task.project_id || '',
      assigned_to: task.assigned_to || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(id);
        loadData();
      } catch (error) {
        alert('Error deleting task.');
      }
    }
  };

  const handleComplete = async (task) => {
    try {
      await updateTask(task.id, { status: 'completed' });
      loadData();
    } catch (error) {
      alert('Error updating task.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      project_id: '',
      assigned_to: user?.id || ''
    });
    setEditingTask(null);
  };

  if (loading) return <div className="page-loading">Loading tasks...</div>;

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Tasks & Projects</h1>
          <p className="page-subtitle">Manage your tasks and track progress</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> Add Task
        </button>
      </div>

      <div className="page-toolbar">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search tasks..." />
        <FilterBar
          filters={[{
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: [
              { value: 'todo', label: 'To Do' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' }
            ]
          }]}
          onFilterChange={(key, value) => setStatusFilter(value)}
        />
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">No tasks found</td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.project_name || '-'}</td>
                  <td>{task.assigned_to_name || '-'}</td>
                  <td>
                    <span className={`status-badge priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`status-badge status-${task.status}`}>
                      {task.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {task.status !== 'completed' && (
                        <button className="btn-icon" onClick={() => handleComplete(task)} title="Complete">
                          <FiCheck />
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => handleEdit(task)}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(task.id)}>
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
              <h2>{editingTask ? 'Edit Task' : 'Add Task'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}>
                <FiX />
              </button>
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
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
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
                  <label>Due Date</label>
                  <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
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
              <div className="form-group">
                <label>Assigned To</label>
                <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingTask ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
