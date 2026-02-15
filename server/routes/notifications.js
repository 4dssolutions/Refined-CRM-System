const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

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

// Get notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, unread_only } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];
    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 50);
    let notifications = await dbAll(query, params);
    if (notifications.length === 0) {
      const { createNotification } = require('../notifications-helper');
      await createNotification(
        req.user.id,
        'email',
        'Welcome to Refined CRM',
        'Notifications will appear here when you receive emails, chat messages, task assignments, and meeting invites.',
        '/',
        null
      );
      notifications = await dbAll(query, params);
    }
    res.json(notifications);
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const row = await dbGet(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count: row.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read (must be before /:id/read)
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await dbGet('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await dbRun('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
