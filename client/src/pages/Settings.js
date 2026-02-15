import React, { useState, useEffect, useContext } from 'react';
import { getUsers, createUser, updateUser, deleteUser, changePassword, getBranches, createBranch, updateBranch, deleteBranch, getSections, getUserPermissions, updateUserPermissions } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FiPlus, FiEdit, FiTrash2, FiX, FiUser, FiLock, FiSave, FiMapPin } from 'react-icons/fi';
import './Customers.css';

const Settings = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'clerk',
    department: '',
    phone: '',
    branch_id: '',
    status: 'active'
  });
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    department: '',
    phone: ''
  });
  // Branch management state
  const [branches, setBranches] = useState([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchFormData, setBranchFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    phone: '',
    status: 'active'
  });
  // Permission management state
  const [sectionDefs, setSectionDefs] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
      loadBranches();
      loadSections();
    } else if (activeTab === 'branches') {
      loadBranches();
    } else if (activeTab === 'profile') {
      setProfileFormData({
        name: currentUser?.name || '',
        department: currentUser?.department || '',
        phone: currentUser?.phone || ''
      });
    }
  }, [activeTab, currentUser]);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await getBranches();
      setBranches(response.data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadSections = async () => {
    try {
      const response = await getSections();
      setSectionDefs(response.data);
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const loadUserPermissions = async (userId) => {
    try {
      const response = await getUserPermissions(userId);
      setUserPermissions(response.data);
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Default all to true
      const defaults = {};
      sectionDefs.forEach(s => { defaults[s.key] = true; });
      setUserPermissions(defaults);
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, branchFormData);
      } else {
        await createBranch(branchFormData);
      }
      setShowBranchModal(false);
      resetBranchForm();
      loadBranches();
      alert('Branch saved successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving branch.');
    }
  };

  const resetBranchForm = () => {
    setBranchFormData({ name: '', address: '', city: '', province: '', postal_code: '', phone: '', status: 'active' });
    setEditingBranch(null);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      let userId;
      if (editingUser) {
        // When editing, don't send password unless it's being changed
        const { password, ...updateData } = userFormData;
        await updateUser(editingUser.id, updateData);
        userId = editingUser.id;
      } else {
        // When creating, password is required
        if (!userFormData.password) {
          alert('Password is required when creating a new user');
          return;
        }
        const res = await createUser(userFormData);
        userId = res.data.id;
      }
      // Save permissions (skip for admin role - they always have full access)
      if (userId && userFormData.role !== 'admin') {
        await updateUserPermissions(userId, userPermissions);
      }
      setShowUserModal(false);
      resetUserForm();
      loadUsers();
      alert('User saved successfully!');
    } catch (error) {
      alert('Error saving user.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!passwordFormData.newPassword) {
      alert('Password is required');
      return;
    }
    try {
      await changePassword(passwordUserId, {
        newPassword: passwordFormData.newPassword
      });
      setShowPasswordModal(false);
      resetPasswordForm();
      alert('Password updated successfully!');
    } catch (error) {
      alert('Error updating password.');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(currentUser.id, profileFormData);
      alert('Profile updated successfully!');
      window.location.reload();
    } catch (error) {
      alert('Error updating profile.');
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'clerk',
      department: '',
      phone: '',
      branch_id: '',
      status: 'active'
    });
    setEditingUser(null);
    // Default all permissions to on for new users
    const defaults = {};
    sectionDefs.forEach(s => { defaults[s.key] = true; });
    setUserPermissions(defaults);
  };

  const resetPasswordForm = () => {
    setPasswordFormData({
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordUserId(null);
  };

  if (loading && activeTab === 'users') return <div className="page-loading">Loading...</div>;

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Manage users and system settings</p>
        </div>
      </div>

      <div className="settings-tabs">
        <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <FiUser /> My Profile
        </button>
        {currentUser?.role === 'admin' && (
          <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <FiUser /> User Management
          </button>
        )}
        {currentUser?.role === 'admin' && (
          <button className={`tab-button ${activeTab === 'branches' ? 'active' : ''}`} onClick={() => setActiveTab('branches')}>
            <FiMapPin /> Branches
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="settings-content">
          <div className="settings-card">
            <h2>Profile Information</h2>
            <form onSubmit={handleProfileSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={profileFormData.name} onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" value={profileFormData.department} onChange={(e) => setProfileFormData({ ...profileFormData, department: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={profileFormData.phone} onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={currentUser?.email || ''} disabled />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={currentUser?.role || ''} disabled />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  <FiSave /> Save Changes
                </button>
                {currentUser?.role === 'admin' && (
                  <button type="button" className="btn-secondary" onClick={() => { setPasswordUserId(currentUser.id); setShowPasswordModal(true); }}>
                    <FiLock /> Change My Password
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'users' && currentUser?.role === 'admin' && (
        <div className="settings-content">
          <div className="page-header" style={{ borderBottom: 'none', paddingBottom: '1rem' }}>
            <div>
              <h2>User Management</h2>
            </div>
            <button className="btn-primary" onClick={() => { resetUserForm(); setShowUserModal(true); }}>
              <FiPlus /> Add User
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Department</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="status-badge">{u.role}</span></td>
                    <td>{u.branch_name || '-'}</td>
                    <td>{u.department || '-'}</td>
                    <td>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                    <td>
                      <span className={`status-badge status-${u.status}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => { setEditingUser(u); setUserFormData({...u, password: ''}); loadUserPermissions(u.id); setShowUserModal(true); }} title="Edit User">
                          <FiEdit />
                        </button>
                        <button className="btn-icon" onClick={() => { setPasswordUserId(u.id); setShowPasswordModal(true); }} title="Change Password">
                          <FiLock />
                        </button>
                        {u.id !== currentUser.id && (
                          <button className="btn-icon btn-danger" onClick={() => { if(window.confirm('Delete user?')) deleteUser(u.id).then(loadUsers); }} title="Delete User">
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="modal-overlay" onClick={() => { setShowUserModal(false); resetUserForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Add User'}</h2>
              <button className="btn-icon" onClick={() => { setShowUserModal(false); resetUserForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handleUserSubmit} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input type="text" required value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" required value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} disabled={!!editingUser} />
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label>Password *</label>
                  <input 
                    type="password" 
                    required 
                    value={userFormData.password} 
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} 
                    placeholder="Enter password for new user"
                  />
                  <small>Set the initial password for this user. Only administrators can change passwords.</small>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select required value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}>
                    <option value="staff">Staff / Contributor</option>
                    <option value="manager">Departmental Manager</option>
                    <option value="executive">Executive / Management</option>
                    <option value="admin">System Administrator</option>
                    <option value="guest">Guest / External User</option>
                  </select>
                  <small>
                    {userFormData.role === 'admin' && 'Full system access, can manage all users and settings'}
                    {userFormData.role === 'executive' && 'Read-only access to all data, can view reports and dashboards'}
                    {userFormData.role === 'manager' && 'Department-specific access, can manage their department data'}
                    {userFormData.role === 'staff' && 'Limited access, can only manage assigned records'}
                    {userFormData.role === 'guest' && 'View-only access to specific files and documents'}
                  </small>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={userFormData.status} onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" value={userFormData.department} onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={userFormData.phone} onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Branch</label>
                <select value={userFormData.branch_id || ''} onChange={(e) => setUserFormData({ ...userFormData, branch_id: e.target.value })}>
                  <option value="">No Branch Assigned</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <small>Users can only chat and email with others in the same branch. Admins have cross-branch access.</small>
              </div>

              {/* Section Permissions */}
              {userFormData.role !== 'admin' && sectionDefs.length > 0 && (
                <div className="permissions-section">
                  <label className="permissions-label">Section Permissions</label>
                  <small className="permissions-hint">Toggle which sections this user can access. Admins always have full access.</small>
                  <div className="permissions-grid">
                    {sectionDefs.map((section) => (
                      <div key={section.key} className="permission-toggle-row">
                        <span className="permission-name">{section.label}</span>
                        <button
                          type="button"
                          className={`permission-toggle ${userPermissions[section.key] !== false ? 'on' : 'off'}`}
                          onClick={() => setUserPermissions(prev => ({ ...prev, [section.key]: prev[section.key] === false ? true : false }))}
                        >
                          <span className="toggle-knob" />
                          <span className="toggle-label">{userPermissions[section.key] !== false ? 'On' : 'Off'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="permissions-quick-actions">
                    <button type="button" className="btn-link" onClick={() => {
                      const all = {};
                      sectionDefs.forEach(s => { all[s.key] = true; });
                      setUserPermissions(all);
                    }}>Enable All</button>
                    <button type="button" className="btn-link" onClick={() => {
                      const none = {};
                      sectionDefs.forEach(s => { none[s.key] = false; });
                      setUserPermissions(none);
                    }}>Disable All</button>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowUserModal(false); resetUserForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => { setShowPasswordModal(false); resetPasswordForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="btn-icon" onClick={() => { setShowPasswordModal(false); resetPasswordForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="modal-form">
              <div className="form-group">
                <label>New Password *</label>
                <input 
                  type="password" 
                  required 
                  value={passwordFormData.newPassword} 
                  onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })} 
                  placeholder="Enter new password"
                />
                <small>As an administrator, you can change any user's password without their current password.</small>
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input 
                  type="password" 
                  required 
                  value={passwordFormData.confirmPassword} 
                  onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })} 
                  placeholder="Confirm new password"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowPasswordModal(false); resetPasswordForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">Change Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'branches' && currentUser?.role === 'admin' && (
        <div className="settings-content">
          <div className="page-header" style={{ borderBottom: 'none', paddingBottom: '1rem' }}>
            <div>
              <h2>Branch Management</h2>
              <p className="page-subtitle">Manage company branches. Users assigned to a branch can only communicate with others in the same branch.</p>
            </div>
            <button className="btn-primary" onClick={() => { resetBranchForm(); setShowBranchModal(true); }}>
              <FiPlus /> Add Branch
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Address</th>
                  <th>Province</th>
                  <th>Phone</th>
                  <th>Users</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">No branches created yet. Add a branch to get started.</td>
                  </tr>
                ) : (
                  branches.map((branch) => (
                    <tr key={branch.id}>
                      <td><strong>{branch.name}</strong></td>
                      <td>{[branch.address, branch.city].filter(Boolean).join(', ') || '-'}</td>
                      <td>{branch.province || '-'}</td>
                      <td>{branch.phone || '-'}</td>
                      <td>{branch.user_count || 0}</td>
                      <td>
                        <span className={`status-badge status-${branch.status}`}>
                          {branch.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon" onClick={() => { setEditingBranch(branch); setBranchFormData(branch); setShowBranchModal(true); }} title="Edit">
                            <FiEdit />
                          </button>
                          <button className="btn-icon btn-danger" onClick={() => { if(window.confirm('Delete this branch?')) deleteBranch(branch.id).then(loadBranches).catch(e => alert(e.response?.data?.error || 'Error deleting branch')); }} title="Delete">
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
        </div>
      )}

      {showBranchModal && (
        <div className="modal-overlay" onClick={() => { setShowBranchModal(false); resetBranchForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBranch ? 'Edit Branch' : 'Add Branch'}</h2>
              <button className="btn-icon" onClick={() => { setShowBranchModal(false); resetBranchForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handleBranchSubmit} className="modal-form">
              <div className="form-group">
                <label>Branch Name *</label>
                <input type="text" required value={branchFormData.name} onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })} placeholder="e.g. Johannesburg Head Office" />
              </div>
              <div className="form-group">
                <label>Street Address</label>
                <input type="text" value={branchFormData.address || ''} onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Town / City</label>
                  <input type="text" value={branchFormData.city || ''} onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Province</label>
                  <input type="text" value={branchFormData.province || ''} onChange={(e) => setBranchFormData({ ...branchFormData, province: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Postal Code</label>
                  <input type="text" value={branchFormData.postal_code || ''} onChange={(e) => setBranchFormData({ ...branchFormData, postal_code: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={branchFormData.phone || ''} onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={branchFormData.status} onChange={(e) => setBranchFormData({ ...branchFormData, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowBranchModal(false); resetBranchForm(); }}>Cancel</button>
                <button type="submit" className="btn-primary">{editingBranch ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
