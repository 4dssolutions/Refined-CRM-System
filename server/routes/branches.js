const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

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

// Get all branches (any authenticated user)
router.get('/', authenticate, async (req, res) => {
  try {
    const branches = await dbAll(
      `SELECT b.*, 
        (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.status = 'active') as user_count
       FROM branches b
       ORDER BY b.name`
    );
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single branch
router.get('/:id', authenticate, async (req, res) => {
  try {
    const branch = await dbGet('SELECT * FROM branches WHERE id = ?', [req.params.id]);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create branch (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, address, city, province, postal_code, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    const existing = await dbGet('SELECT id FROM branches WHERE name = ?', [name.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'A branch with this name already exists' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO branches (id, name, address, city, province, postal_code, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), address || null, city || null, province || null, postal_code || null, phone || null]
    );

    const branch = await dbGet('SELECT * FROM branches WHERE id = ?', [id]);
    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update branch (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, address, city, province, postal_code, phone, status } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (city !== undefined) { updates.push('city = ?'); params.push(city); }
    if (province !== undefined) { updates.push('province = ?'); params.push(province); }
    if (postal_code !== undefined) { updates.push('postal_code = ?'); params.push(postal_code); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(`UPDATE branches SET ${updates.join(', ')} WHERE id = ?`, params);
    const branch = await dbGet('SELECT * FROM branches WHERE id = ?', [req.params.id]);
    res.json(branch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete branch (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Check if any users are assigned to this branch
    const usersInBranch = await dbGet(
      'SELECT COUNT(*) as count FROM users WHERE branch_id = ?',
      [req.params.id]
    );
    if (usersInBranch && usersInBranch.count > 0) {
      return res.status(400).json({
        error: `Cannot delete branch: ${usersInBranch.count} user(s) are still assigned to it. Reassign them first.`
      });
    }

    await dbRun('DELETE FROM branches WHERE id = ?', [req.params.id]);
    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
