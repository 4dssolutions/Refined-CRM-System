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

// Get all workflows (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const workflows = await dbAll(`
      SELECT w.*, u.name as created_by_name
      FROM workflows w
      LEFT JOIN users u ON w.created_by = u.id
      ORDER BY w.created_at DESC
    `);
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create workflow (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, trigger_type, trigger_conditions, actions, status } = req.body;
    
    if (!name || !trigger_type) {
      return res.status(400).json({ error: 'Name and trigger type are required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO workflows (id, name, description, trigger_type, trigger_conditions, actions, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, trigger_type, JSON.stringify(trigger_conditions), JSON.stringify(actions), status || 'active', req.user.id]
    );

    const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [id]);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update workflow (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, trigger_type, trigger_conditions, actions, status } = req.body;
    
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (trigger_type !== undefined) {
      updates.push('trigger_type = ?');
      params.push(trigger_type);
    }
    if (trigger_conditions !== undefined) {
      updates.push('trigger_conditions = ?');
      params.push(JSON.stringify(trigger_conditions));
    }
    if (actions !== undefined) {
      updates.push('actions = ?');
      params.push(JSON.stringify(actions));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`, params);
    const workflow = await dbGet('SELECT * FROM workflows WHERE id = ?', [req.params.id]);
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete workflow (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await dbRun('DELETE FROM workflows WHERE id = ?', [req.params.id]);
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
