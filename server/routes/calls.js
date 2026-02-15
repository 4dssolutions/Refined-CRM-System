const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../notifications-helper');

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

// Get all calls (own calls for regular users, all for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let query = `
      SELECT c.*, u.name as caller_name
      FROM calls c
      LEFT JOIN users u ON c.caller_id = u.id
    `;
    const params = [];

    if (!isAdmin) {
      query += ' WHERE c.caller_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY c.created_at DESC';
    const calls = await dbAll(query, params);
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contacts for the dialer (customers + suppliers + org contacts)
// IMPORTANT: This must be before /:id to avoid route conflict
router.get('/contacts/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const term = `%${(q || '').trim()}%`;

    const customers = await dbAll(
      `SELECT id, name, phone, email, 'customer' as type FROM customers
       WHERE status = 'active' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
       ORDER BY name LIMIT 10`,
      [term, term, term]
    );

    const suppliers = await dbAll(
      `SELECT id, name, phone, email, 'supplier' as type FROM suppliers
       WHERE status = 'active' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
       ORDER BY name LIMIT 10`,
      [term, term, term]
    );

    const orgs = await dbAll(
      `SELECT id, name, phone, email, 'organization' as type FROM organizations
       WHERE status = 'active' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
       ORDER BY name LIMIT 10`,
      [term, term, term]
    );

    res.json([...customers, ...suppliers, ...orgs]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single call
router.get('/:id', authenticate, async (req, res) => {
  try {
    const call = await dbGet(`
      SELECT c.*, u.name as caller_name
      FROM calls c
      LEFT JOIN users u ON c.caller_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Non-admins can only see their own calls
    if (req.user.role !== 'admin' && call.caller_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(call);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log a new call
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      contact_name,
      contact_phone,
      contact_type,
      contact_id,
      direction,
      status,
      outcome,
      duration,
      notes,
      started_at,
      ended_at
    } = req.body;

    if (!contact_phone) {
      return res.status(400).json({ error: 'Contact phone number is required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO calls (id, caller_id, contact_name, contact_phone, contact_type, contact_id, direction, status, outcome, duration, notes, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        contact_name || null,
        contact_phone,
        contact_type || 'customer',
        contact_id || null,
        direction || 'outbound',
        status || 'completed',
        outcome || 'connected',
        duration || 0,
        notes || null,
        started_at || new Date().toISOString(),
        ended_at || null
      ]
    );

    const call = await dbGet(`
      SELECT c.*, u.name as caller_name
      FROM calls c
      LEFT JOIN users u ON c.caller_id = u.id
      WHERE c.id = ?
    `, [id]);

    res.status(201).json(call);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a call (add notes, change outcome, etc.)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const existing = await dbGet('SELECT * FROM calls WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (req.user.role !== 'admin' && existing.caller_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { outcome, notes, duration, status, ended_at } = req.body;
    const updates = [];
    const params = [];

    if (outcome !== undefined) { updates.push('outcome = ?'); params.push(outcome); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (duration !== undefined) { updates.push('duration = ?'); params.push(duration); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (ended_at !== undefined) { updates.push('ended_at = ?'); params.push(ended_at); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(req.params.id);
    await dbRun(`UPDATE calls SET ${updates.join(', ')} WHERE id = ?`, params);

    const call = await dbGet(`
      SELECT c.*, u.name as caller_name
      FROM calls c
      LEFT JOIN users u ON c.caller_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    res.json(call);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a call
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await dbGet('SELECT * FROM calls WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (req.user.role !== 'admin' && existing.caller_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await dbRun('DELETE FROM calls WHERE id = ?', [req.params.id]);
    res.json({ message: 'Call deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a task from a call
router.post('/:id/task', authenticate, async (req, res) => {
  try {
    const call = await dbGet('SELECT * FROM calls WHERE id = ?', [req.params.id]);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const { title, description, due_date, assigned_to, priority } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const taskId = uuidv4();
    await dbRun(
      `INSERT INTO tasks (id, title, description, status, priority, due_date, assigned_to, created_by)
       VALUES (?, ?, ?, 'todo', ?, ?, ?, ?)`,
      [
        taskId,
        title,
        description || `Follow-up from call with ${call.contact_name || call.contact_phone}`,
        priority || 'medium',
        due_date || null,
        assigned_to || req.user.id,
        req.user.id
      ]
    );

    // Notify assigned user if different from creator
    if (assigned_to && assigned_to !== req.user.id) {
      await createNotification(
        assigned_to,
        'task',
        `New task from call: ${title}`,
        `Follow-up from call with ${call.contact_name || call.contact_phone}`,
        '/tasks',
        taskId
      );
    }

    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a meeting from a call
router.post('/:id/meeting', authenticate, async (req, res) => {
  try {
    const call = await dbGet('SELECT * FROM calls WHERE id = ?', [req.params.id]);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const { title, description, start_time, end_time, location, meeting_type } = req.body;
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time and end time are required' });
    }

    const meetingId = uuidv4();
    await dbRun(
      `INSERT INTO meetings (id, title, description, start_time, end_time, location, meeting_type, organizer_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [
        meetingId,
        title,
        description || `Follow-up meeting from call with ${call.contact_name || call.contact_phone}`,
        start_time,
        end_time,
        location || null,
        meeting_type || 'internal',
        req.user.id
      ]
    );

    // Add the organizer as participant
    await dbRun(
      `INSERT INTO meeting_participants (id, meeting_id, user_id, status) VALUES (?, ?, ?, 'accepted')`,
      [uuidv4(), meetingId, req.user.id]
    );

    await createNotification(
      req.user.id,
      'meeting',
      `Meeting scheduled: ${title}`,
      `Follow-up from call with ${call.contact_name || call.contact_phone}`,
      '/meetings',
      meetingId
    );

    const meeting = await dbGet('SELECT * FROM meetings WHERE id = ?', [meetingId]);
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
