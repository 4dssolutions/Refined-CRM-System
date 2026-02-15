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

// Get all calendar events
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    let query = `
      SELECT ce.*, u.name as user_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND ce.start_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ce.end_time <= ?';
      params.push(end_date);
    }
    if (user_id) {
      query += ' AND ce.user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY ce.start_time ASC';
    const events = await dbAll(query, params);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await dbGet(`
      SELECT ce.*, u.name as user_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.user_id = u.id
      WHERE ce.id = ?
    `, [req.params.id]);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, event_type, location, color, all_day } = req.body;
    
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO calendar_events (id, title, description, start_time, end_time, event_type, location, user_id, color, all_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, start_time, end_time, event_type || 'meeting', location, req.user.id, color || '#3b82f6', all_day || 0]
    );
    await createNotification(
      req.user.id,
      'calendar',
      `Calendar event: ${title}`,
      `${new Date(start_time).toLocaleString()} - ${new Date(end_time).toLocaleString()}`,
      '/calendar',
      id
    );
    const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, event_type, location, color, all_day } = req.body;
    
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (start_time !== undefined) {
      updates.push('start_time = ?');
      params.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push('end_time = ?');
      params.push(end_time);
    }
    if (event_type !== undefined) {
      updates.push('event_type = ?');
      params.push(event_type);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      params.push(location);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (all_day !== undefined) {
      updates.push('all_day = ?');
      params.push(all_day);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`, params);
    const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await dbRun('DELETE FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
