const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { checkPermission, PERMISSIONS } = require('../middleware/permissions');

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.getDb().run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.getDb().all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.getDb().get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// ===== Section Permission Definitions =====
const ALL_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'emails', label: 'Email' },
  { key: 'chat', label: 'Chat' },
  { key: 'calls', label: 'Calls' },
  { key: 'tasks', label: 'Tasks & Projects' },
  { key: 'projects', label: 'Projects' },
  { key: 'organizations', label: 'Contacts & Organizations' },
  { key: 'documents', label: 'Documents' },
  { key: 'calendar', label: 'Calendar & Scheduling' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'customers', label: 'Customers' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
  { key: 'leads', label: 'Leads' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'audit', label: 'Audit Logs' },
];

// Get section definitions
router.get('/sections', authenticate, (req, res) => {
  res.json(ALL_SECTIONS);
});

// Get permissions for a specific user (admin only, or own)
router.get('/:id/permissions', authenticate, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const perms = await dbAll('SELECT section, enabled FROM user_permissions WHERE user_id = ?', [req.params.id]);
    // Return as object { section: boolean }
    const permMap = {};
    ALL_SECTIONS.forEach(s => { permMap[s.key] = true; }); // default all on
    perms.forEach(p => { permMap[p.section] = !!p.enabled; });
    res.json(permMap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set permissions for a user (admin only)
router.put('/:id/permissions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { permissions } = req.body; // { section: boolean, ... }
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Permissions object required' });
    }

    const userId = req.params.id;
    // Upsert each permission
    for (const [section, enabled] of Object.entries(permissions)) {
      const existing = await dbGet('SELECT id FROM user_permissions WHERE user_id = ? AND section = ?', [userId, section]);
      if (existing) {
        await dbRun('UPDATE user_permissions SET enabled = ? WHERE user_id = ? AND section = ?', [enabled ? 1 : 0, userId, section]);
      } else {
        const { v4: uuidv4 } = require('uuid');
        await dbRun('INSERT INTO user_permissions (id, user_id, section, enabled) VALUES (?, ?, ?, ?)', [uuidv4(), userId, section, enabled ? 1 : 0]);
      }
    }

    // Return updated permissions
    const perms = await dbAll('SELECT section, enabled FROM user_permissions WHERE user_id = ?', [userId]);
    const permMap = {};
    ALL_SECTIONS.forEach(s => { permMap[s.key] = true; });
    perms.forEach(p => { permMap[p.section] = !!p.enabled; });
    res.json(permMap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users for task/meeting assignment (any authenticated user)
router.get('/assignable', authenticate, async (req, res) => {
  try {
    const users = await dbAll(
      'SELECT id, name, email FROM users WHERE status = ? ORDER BY name',
      ['active']
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin/executive/manager only)
router.get('/', authenticate, authorize('admin', 'executive', 'manager'), async (req, res) => {
  try {
    let query = `SELECT u.id, u.email, u.name, u.role, u.department, u.phone, u.avatar, u.status, u.last_login, u.created_at, u.branch_id, b.name as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE 1=1`;
    const params = [];
    
    // Managers can only see users in their department
    if (req.user.role === 'manager' && req.user.department) {
      query += ' AND u.department = ?';
      params.push(req.user.department);
    }
    
    query += ' ORDER BY u.created_at DESC';
    const users = await dbAll(query, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Users can view their own profile, admins/managers can view any
    if (req.user.id !== req.params.id && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const user = await dbGet('SELECT id, email, name, role, department, phone, avatar, status, created_at FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user (admin only)
router.post('/', authenticate, authorize('admin'), auditMiddleware('create', 'user'), async (req, res) => {
  try {
    const { email, password, name, role, department, phone, branch_id } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    
    await dbRun(
      `INSERT INTO users (id, email, password, name, role, department, phone, branch_id, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, email, hashedPassword, name, role || 'clerk', department, phone, branch_id || null, req.user.id]
    );

    const user = await dbGet('SELECT id, email, name, role, department, phone, status, created_at FROM users WHERE id = ?', [id]);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', authenticate, auditMiddleware('update', 'user'), async (req, res) => {
  try {
    // Users can update their own profile (limited fields), admins can update any
    if (req.user.id !== req.params.id && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Regular users can only update their own name, department, phone
    if (req.user.id === req.params.id && req.user.role !== 'admin') {
      const allowedFields = ['name', 'department', 'phone'];
      Object.keys(req.body).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete req.body[key];
        }
      });
    }

    const { name, role, department, phone, status, branch_id } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (role !== undefined && req.user.role === 'admin') {
      updates.push('role = ?');
      params.push(role);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      params.push(department);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (status !== undefined && req.user.role === 'admin') {
      updates.push('status = ?');
      params.push(status);
    }
    if (branch_id !== undefined && req.user.role === 'admin') {
      updates.push('branch_id = ?');
      params.push(branch_id || null);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const user = await dbGet(
      `SELECT u.id, u.email, u.name, u.role, u.department, u.phone, u.status, u.branch_id, u.created_at, b.name as branch_name
       FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.id = ?`,
      [req.params.id]
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password (admin only - users cannot change their own passwords)
router.put('/:id/password', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const user = await dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, req.params.id]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), auditMiddleware('delete', 'user'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
