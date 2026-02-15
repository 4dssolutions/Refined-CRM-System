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

// Get all meetings
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    let query = `
      SELECT m.*, 
        u.name as organizer_name,
        (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id) as participant_count
      FROM meetings m
      LEFT JOIN users u ON m.organizer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND m.start_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND m.end_time <= ?';
      params.push(end_date);
    }
    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.start_time ASC';
    const meetings = await dbAll(query, params);
    
    // Get participants for each meeting
    for (let meeting of meetings) {
      meeting.participants = await dbAll(`
        SELECT mp.*, u.name as user_name, u.email as user_email
        FROM meeting_participants mp
        LEFT JOIN users u ON mp.user_id = u.id
        WHERE mp.meeting_id = ?
      `, [meeting.id]);
    }
    
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get meeting by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const meeting = await dbGet(`
      SELECT m.*, u.name as organizer_name
      FROM meetings m
      LEFT JOIN users u ON m.organizer_id = u.id
      WHERE m.id = ?
    `, [req.params.id]);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    meeting.participants = await dbAll(`
      SELECT mp.*, u.name as user_name, u.email as user_email
      FROM meeting_participants mp
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mp.meeting_id = ?
    `, [meeting.id]);
    
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create meeting
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, location, meeting_type, participant_ids } = req.body;
    
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO meetings (id, title, description, start_time, end_time, location, meeting_type, organizer_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [id, title, description, start_time, end_time, location, meeting_type || 'internal', req.user.id]
    );

    // Add participants
    if (participant_ids && participant_ids.length > 0) {
      const organizerName = req.user.name || 'Someone';
      for (const userId of participant_ids) {
        if (userId !== req.user.id) {
          const participantId = uuidv4();
          await dbRun(
            'INSERT INTO meeting_participants (id, meeting_id, user_id, status) VALUES (?, ?, ?, ?)',
            [participantId, id, userId, 'invited']
          );
          await createNotification(
            userId,
            'meeting',
            `Meeting invite: ${title}`,
            `${organizerName} invited you to a meeting`,
            '/meetings',
            id
          );
        }
      }
    }

    const meeting = await dbGet('SELECT * FROM meetings WHERE id = ?', [id]);
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update meeting
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, start_time, end_time, location, meeting_type, status } = req.body;
    
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
    if (location !== undefined) {
      updates.push('location = ?');
      params.push(location);
    }
    if (meeting_type !== undefined) {
      updates.push('meeting_type = ?');
      params.push(meeting_type);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(`UPDATE meetings SET ${updates.join(', ')} WHERE id = ?`, params);
    const meeting = await dbGet('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add participant to meeting
router.post('/:id/participants', authenticate, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const meeting = await dbGet('SELECT title FROM meetings WHERE id = ?', [req.params.id]);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const participantId = uuidv4();
    await dbRun(
      'INSERT INTO meeting_participants (id, meeting_id, user_id, status) VALUES (?, ?, ?, ?)',
      [participantId, req.params.id, user_id, 'invited']
    );
    if (user_id !== req.user.id) {
      await createNotification(
        user_id,
        'meeting',
        `Meeting invite: ${meeting.title}`,
        `${req.user.name || 'Someone'} added you to a meeting`,
        '/meetings',
        req.params.id
      );
    }
    res.status(201).json({ message: 'Participant added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete meeting
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await dbRun('DELETE FROM meeting_participants WHERE meeting_id = ?', [req.params.id]);
    await dbRun('DELETE FROM meetings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
