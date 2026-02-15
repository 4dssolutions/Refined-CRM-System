const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../notifications-helper');
const { sendMail, isConfigured } = require('../email-service');

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

// Role-based email sending permissions
const canSendEmailTo = (senderRole, recipientRole) => {
  // Admin and executive can send to anyone
  if (['admin', 'executive'].includes(senderRole)) {
    return true;
  }
  
  // Manager can send to managers, staff, and themselves
  if (senderRole === 'manager') {
    return ['admin', 'executive', 'manager', 'staff'].includes(recipientRole);
  }
  
  // Staff can send to staff, managers, and themselves
  if (senderRole === 'staff') {
    return ['admin', 'executive', 'manager', 'staff'].includes(recipientRole);
  }
  
  // Guest can send to staff and themselves
  if (senderRole === 'guest') {
    return ['staff', 'guest'].includes(recipientRole);
  }
  
  return false;
};

// Get all emails for the current user (inbox, sent, etc.)
router.get('/', authenticate, async (req, res) => {
  try {
    const { folder = 'inbox', search } = req.query;
    const userId = req.user.id;
    
    let query = '';
    let params = [];
    
    if (folder === 'inbox') {
      query = `
        SELECT e.*, 
               u1.name as sender_name, u1.email as sender_email,
               u2.name as recipient_name, u2.email as recipient_email
        FROM emails e
        LEFT JOIN users u1 ON e.sender_id = u1.id
        LEFT JOIN users u2 ON e.recipient_id = u2.id
        WHERE e.recipient_id = ? AND e.folder = 'inbox' AND e.is_archived = 0
      `;
      params = [userId];
    } else if (folder === 'sent') {
      query = `
        SELECT e.*, 
               u1.name as sender_name, u1.email as sender_email,
               COALESCE(e.recipient_email, u2.email) as recipient_email,
               CASE WHEN e.recipient_email IS NOT NULL THEN e.recipient_email ELSE u2.name END as recipient_name
        FROM emails e
        LEFT JOIN users u1 ON e.sender_id = u1.id
        LEFT JOIN users u2 ON e.recipient_id = u2.id
        WHERE e.sender_id = ? AND e.folder = 'sent' AND e.is_archived = 0
      `;
      params = [userId];
    } else if (folder === 'draft') {
      query = `
        SELECT e.*, 
               u1.name as sender_name, u1.email as sender_email,
               u2.name as recipient_name, u2.email as recipient_email
        FROM emails e
        LEFT JOIN users u1 ON e.sender_id = u1.id
        LEFT JOIN users u2 ON e.recipient_id = u2.id
        WHERE e.sender_id = ? AND e.folder = 'draft' AND e.is_archived = 0
      `;
      params = [userId];
    } else if (folder === 'archived') {
      query = `
        SELECT e.*, 
               u1.name as sender_name, u1.email as sender_email,
               u2.name as recipient_name, u2.email as recipient_email
        FROM emails e
        LEFT JOIN users u1 ON e.sender_id = u1.id
        LEFT JOIN users u2 ON e.recipient_id = u2.id
        WHERE (e.sender_id = ? OR e.recipient_id = ?) AND e.is_archived = 1
      `;
      params = [userId, userId];
    } else if (folder === 'starred') {
      query = `
        SELECT e.*, 
               u1.name as sender_name, u1.email as sender_email,
               u2.name as recipient_name, u2.email as recipient_email
        FROM emails e
        LEFT JOIN users u1 ON e.sender_id = u1.id
        LEFT JOIN users u2 ON e.recipient_id = u2.id
        WHERE (e.sender_id = ? OR e.recipient_id = ?) AND e.is_starred = 1 AND e.is_archived = 0
      `;
      params = [userId, userId];
    }
    
    if (search) {
      query += ` AND (e.subject LIKE ? OR e.body LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY e.created_at DESC';
    
    const emails = await dbAll(query, params);
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single email
router.get('/:id', authenticate, async (req, res) => {
  try {
    const email = await dbGet(`
      SELECT e.*, 
             u1.name as sender_name, u1.email as sender_email, u1.role as sender_role,
             COALESCE(e.recipient_email, u2.email) as recipient_email,
             CASE WHEN e.recipient_email IS NOT NULL THEN e.recipient_email ELSE u2.name END as recipient_name,
             u2.role as recipient_role
      FROM emails e
      LEFT JOIN users u1 ON e.sender_id = u1.id
      LEFT JOIN users u2 ON e.recipient_id = u2.id
      WHERE e.id = ?
    `, [req.params.id]);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Check if user has access to this email (sender can always see; recipient for internal emails)
    const isSender = email.sender_id === req.user.id;
    const isRecipient = email.recipient_id === req.user.id;
    if (!isSender && !isRecipient) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this email' });
    }
    
    // Mark as read if user is the recipient
    if (email.recipient_id === req.user.id && !email.is_read) {
      await dbRun('UPDATE emails SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
      email.is_read = 1;
    }
    
    res.json(email);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send an email
router.post('/', authenticate, async (req, res) => {
  try {
    const { recipient_id, subject, body, parent_email_id, save_as_draft } = req.body;
    const senderId = req.user.id;
    
    if (!recipient_id && !save_as_draft) {
      return res.status(400).json({ error: 'Recipient is required' });
    }
    
    if (!subject && !save_as_draft) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    
    if (!body && !save_as_draft) {
      return res.status(400).json({ error: 'Body is required' });
    }
    
    // If saving as draft, skip recipient validation
    if (save_as_draft) {
      const emailId = uuidv4();
      await dbRun(
        `INSERT INTO emails (id, sender_id, recipient_id, subject, body, folder, parent_email_id)
         VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
        [emailId, senderId, recipient_id || null, subject || '', body || '', parent_email_id || null]
      );
      const email = await dbGet(`
        SELECT e.*, 
               u1.name as sender_name, u1.email as sender_email,
               u2.name as recipient_name, u2.email as recipient_email
        FROM emails e
        LEFT JOIN users u1 ON e.sender_id = u1.id
        LEFT JOIN users u2 ON e.recipient_id = u2.id
        WHERE e.id = ?
      `, [emailId]);
      return res.status(201).json(email);
    }
    
    // Get recipient to check role
    const recipient = await dbGet('SELECT id, role FROM users WHERE id = ? AND status = ?', [recipient_id, 'active']);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found or inactive' });
    }
    
    // Check if sender can send to this recipient based on roles
    if (!canSendEmailTo(req.user.role, recipient.role)) {
      return res.status(403).json({ 
        error: `You do not have permission to send emails to users with role: ${recipient.role}` 
      });
    }
    
    const emailId = uuidv4();
    await dbRun(
      `INSERT INTO emails (id, sender_id, recipient_id, subject, body, folder, parent_email_id)
       VALUES (?, ?, ?, ?, ?, 'sent', ?)`,
      [emailId, senderId, recipient_id, subject, body, parent_email_id || null]
    );
    
    // Also create inbox entry for recipient
    const inboxEmailId = uuidv4();
    await dbRun(
      `INSERT INTO emails (id, sender_id, recipient_id, subject, body, folder, parent_email_id)
       VALUES (?, ?, ?, ?, ?, 'inbox', ?)`,
      [inboxEmailId, senderId, recipient_id, subject, body, parent_email_id || null]
    );
    const sender = await dbGet('SELECT name FROM users WHERE id = ?', [senderId]);
    await createNotification(
      recipient_id,
      'email',
      `New email from ${sender?.name || 'Someone'}`,
      subject,
      '/emails',
      inboxEmailId
    );
    const email = await dbGet(`
      SELECT e.*, 
             u1.name as sender_name, u1.email as sender_email,
             u2.name as recipient_name, u2.email as recipient_email
      FROM emails e
      LEFT JOIN users u1 ON e.sender_id = u1.id
      LEFT JOIN users u2 ON e.recipient_id = u2.id
      WHERE e.id = ?
    `, [emailId]);
    
    res.status(201).json(email);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update email (mark as read, starred, archived, etc.)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { is_read, is_starred, is_archived, folder } = req.body;
    const userId = req.user.id;
    
    // Check if user has access to this email
    const email = await dbGet('SELECT * FROM emails WHERE id = ?', [req.params.id]);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    if (email.sender_id !== userId && email.recipient_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this email' });
    }
    
    const updates = [];
    const params = [];
    
    if (is_read !== undefined) {
      updates.push('is_read = ?');
      params.push(is_read ? 1 : 0);
      if (is_read) {
        updates.push('read_at = CURRENT_TIMESTAMP');
      }
    }
    
    if (is_starred !== undefined) {
      updates.push('is_starred = ?');
      params.push(is_starred ? 1 : 0);
    }
    
    if (is_archived !== undefined) {
      updates.push('is_archived = ?');
      params.push(is_archived ? 1 : 0);
    }
    
    if (folder !== undefined) {
      updates.push('folder = ?');
      params.push(folder);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    params.push(req.params.id);
    await dbRun(`UPDATE emails SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const updatedEmail = await dbGet(`
      SELECT e.*, 
             u1.name as sender_name, u1.email as sender_email,
             u2.name as recipient_name, u2.email as recipient_email
      FROM emails e
      LEFT JOIN users u1 ON e.sender_id = u1.id
      LEFT JOIN users u2 ON e.recipient_id = u2.id
      WHERE e.id = ?
    `, [req.params.id]);
    
    res.json(updatedEmail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete email (move to trash)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const email = await dbGet('SELECT * FROM emails WHERE id = ?', [req.params.id]);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    if (email.sender_id !== userId && email.recipient_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this email' });
    }
    
    await dbRun('UPDATE emails SET folder = ?, is_archived = 1 WHERE id = ?', ['trash', req.params.id]);
    
    res.json({ message: 'Email moved to trash' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if SMTP is configured
router.get('/smtp/status', authenticate, (req, res) => {
  res.json({ configured: isConfigured() });
});

// Send email to external address (real outbound via SMTP)
router.post('/send-external', authenticate, async (req, res) => {
  try {
    const { to_email, subject, body } = req.body;
    const senderId = req.user.id;

    if (!to_email || !to_email.trim()) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }
    const toEmail = to_email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        error: 'SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env'
      });
    }

    const sender = await dbGet('SELECT name, email FROM users WHERE id = ?', [senderId]);
    await sendMail({
      to: toEmail,
      subject: subject.trim(),
      body: body.trim(),
      replyTo: sender?.email || undefined
    });

    const emailId = uuidv4();
    const externalUserId = 'external-placeholder';
    await dbRun(
      `INSERT INTO emails (id, sender_id, recipient_id, recipient_email, subject, body, folder)
       VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
      [emailId, senderId, externalUserId, toEmail, subject.trim(), body.trim()]
    );

    const email = await dbGet(
      `SELECT e.*, 
              u1.name as sender_name, u1.email as sender_email
       FROM emails e
       LEFT JOIN users u1 ON e.sender_id = u1.id
       WHERE e.id = ?`,
      [emailId]
    );
    email.recipient_name = toEmail;
    email.recipient_email = toEmail;

    res.status(201).json(email);
  } catch (error) {
    console.error('External email error:', error);
    res.status(500).json({
      error: error.message || 'Failed to send email. Check SMTP configuration.'
    });
  }
});

// Get available recipients based on user's role AND branch
router.get('/recipients/available', authenticate, async (req, res) => {
  try {
    const senderRole = req.user.role;
    const isAdmin = senderRole === 'admin';
    let allowedRoles = [];
    
    // Determine which roles the sender can email
    if (['admin', 'executive'].includes(senderRole)) {
      allowedRoles = ['admin', 'executive', 'manager', 'staff', 'guest'];
    } else if (senderRole === 'manager') {
      allowedRoles = ['admin', 'executive', 'manager', 'staff'];
    } else if (senderRole === 'staff') {
      allowedRoles = ['admin', 'executive', 'manager', 'staff'];
    } else if (senderRole === 'guest') {
      allowedRoles = ['staff', 'guest'];
    }

    // Get current user's branch
    const userRecord = await dbGet('SELECT branch_id FROM users WHERE id = ?', [req.user.id]);
    const branchId = userRecord?.branch_id;

    let query = `SELECT id, name, email, role, department, status, branch_id 
       FROM users 
       WHERE role IN (${allowedRoles.map(() => '?').join(',')}) 
       AND status = 'active' 
       AND id != ?`;
    const params = [...allowedRoles, req.user.id];

    // Non-admin users only see recipients in their own branch
    if (!isAdmin && branchId) {
      query += ' AND branch_id = ?';
      params.push(branchId);
    }

    query += ' ORDER BY name';
    const recipients = await dbAll(query, params);
    
    res.json(recipients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get email statistics
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = {
      inbox: (await dbGet(
        `SELECT COUNT(*) as count FROM emails 
         WHERE recipient_id = ? AND folder = 'inbox' AND is_archived = 0 AND is_read = 0`,
        [userId]
      )).count,
      sent: (await dbGet(
        `SELECT COUNT(*) as count FROM emails 
         WHERE sender_id = ? AND folder = 'sent' AND is_archived = 0`,
        [userId]
      )).count,
      drafts: (await dbGet(
        `SELECT COUNT(*) as count FROM emails 
         WHERE sender_id = ? AND folder = 'draft' AND is_archived = 0`,
        [userId]
      )).count,
      starred: (await dbGet(
        `SELECT COUNT(*) as count FROM emails 
         WHERE (sender_id = ? OR recipient_id = ?) AND is_starred = 1 AND is_archived = 0`,
        [userId, userId]
      )).count
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
