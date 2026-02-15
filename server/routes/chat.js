const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|xls|xlsx|txt|png|jpg|jpeg|gif|webp)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG, JPEG, GIF, WEBP'));
    }
  }
});

// Ensure default chat room exists
const ensureDefaultRoom = async () => {
  const room = await dbGet("SELECT id FROM chat_rooms WHERE name = 'General' AND type = 'channel' LIMIT 1");
  if (!room) {
    const id = uuidv4();
    await dbRun("INSERT INTO chat_rooms (id, name, type) VALUES (?, 'General', 'channel')", [id]);
    return id;
  }
  return room.id;
};

// Get users available for DMs (branch-scoped: users see only their branch; admins see all)
router.get('/users', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userRecord = await dbGet('SELECT branch_id FROM users WHERE id = ?', [req.user.id]);
    const branchId = userRecord?.branch_id;

    let query = `SELECT id, name, email, role, branch_id FROM users WHERE status = 'active' AND id != ?`;
    const params = [req.user.id];

    // Non-admin users only see users in their own branch
    if (!isAdmin && branchId) {
      query += ' AND branch_id = ?';
      params.push(branchId);
    }

    query += ' ORDER BY name';
    const users = await dbAll(query, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chat rooms (channels + DMs for current user)
router.get('/rooms', authenticate, async (req, res) => {
  try {
    await ensureDefaultRoom();
    const userId = req.user.id;

    const channels = await dbAll(
      "SELECT * FROM chat_rooms WHERE type = 'channel' ORDER BY name"
    );

    const dmRooms = await dbAll(
      `SELECT r.*, u.name as other_user_name
       FROM chat_rooms r
       JOIN chat_room_participants p1 ON r.id = p1.room_id AND p1.user_id = ?
       JOIN chat_room_participants p2 ON r.id = p2.room_id AND p2.user_id != ?
       JOIN users u ON p2.user_id = u.id
       WHERE r.type = 'dm'
       ORDER BY r.created_at DESC`,
      [userId, userId]
    );

    const rooms = [
      ...channels.map(r => ({ ...r, displayName: r.name })),
      ...dmRooms.map(r => ({ ...r, displayName: r.other_user_name, isDm: true }))
    ];
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or get DM room with another user
router.post('/rooms/dm', authenticate, async (req, res) => {
  try {
    const { other_user_id } = req.body;
    const userId = req.user.id;

    if (!other_user_id) {
      return res.status(400).json({ error: 'other_user_id is required' });
    }
    if (other_user_id === userId) {
      return res.status(400).json({ error: 'Cannot start DM with yourself' });
    }

    const otherUser = await dbGet('SELECT id, name FROM users WHERE id = ? AND status = ?', [other_user_id, 'active']);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ids = [userId, other_user_id].sort();
    const existingRoom = await dbGet(
      `SELECT r.id FROM chat_rooms r
       JOIN chat_room_participants p1 ON r.id = p1.room_id AND p1.user_id = ?
       JOIN chat_room_participants p2 ON r.id = p2.room_id AND p2.user_id = ?
       WHERE r.type = 'dm'`,
      [ids[0], ids[1]]
    );

    if (existingRoom) {
      const room = await dbGet(
        `SELECT r.*, u.name as other_user_name FROM chat_rooms r
         JOIN chat_room_participants p ON r.id = p.room_id AND p.user_id != ?
         JOIN users u ON p.user_id = u.id
         WHERE r.id = ?`,
        [userId, existingRoom.id]
      );
      return res.json({ ...room, displayName: room.other_user_name, isDm: true });
    }

    const roomId = uuidv4();
    const roomName = `dm-${ids[0]}-${ids[1]}`;
    await dbRun(
      "INSERT INTO chat_rooms (id, name, type) VALUES (?, ?, 'dm')",
      [roomId, roomName]
    );
    await dbRun(
      "INSERT INTO chat_room_participants (id, room_id, user_id) VALUES (?, ?, ?)",
      [uuidv4(), roomId, userId]
    );
    await dbRun(
      "INSERT INTO chat_room_participants (id, room_id, user_id) VALUES (?, ?, ?)",
      [uuidv4(), roomId, other_user_id]
    );

    const room = { id: roomId, name: roomName, type: 'dm', displayName: otherUser.name, isDm: true };
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user has access to room
const canAccessRoom = async (userId, roomId) => {
  const room = await dbGet('SELECT * FROM chat_rooms WHERE id = ?', [roomId]);
  if (!room) return false;
  if (room.type === 'channel') return true;
  const participant = await dbGet(
    'SELECT id FROM chat_room_participants WHERE room_id = ? AND user_id = ?',
    [roomId, userId]
  );
  return !!participant;
};

// Get messages for a room
router.get('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 100, before } = req.query;
    const userId = req.user.id;

    const hasAccess = await canAccessRoom(userId, roomId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT m.*, u.name as user_name
      FROM chat_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
    `;
    const params = [roomId];

    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 100);

    const messages = await dbAll(query, params);
    const reversed = messages.reverse();

    for (const msg of reversed) {
      msg.attachments = await dbAll(
        'SELECT id, file_name, file_path, file_type, file_size FROM chat_message_attachments WHERE message_id = ?',
        [msg.id]
      );
    }

    res.json(reversed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message (text only)
router.post('/rooms/:roomId/messages', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const hasAccess = await canAccessRoom(userId, roomId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = uuidv4();
    await dbRun(
      'INSERT INTO chat_messages (id, room_id, user_id, message) VALUES (?, ?, ?, ?)',
      [id, roomId, userId, String(message).trim()]
    );

    const newMessage = await dbGet(
      `SELECT m.*, u.name as user_name
       FROM chat_messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`,
      [id]
    );
    newMessage.attachments = [];
    const room = await dbGet('SELECT * FROM chat_rooms WHERE id = ?', [roomId]);
    if (room && room.type === 'dm') {
      const otherParticipants = await dbAll(
        'SELECT user_id FROM chat_room_participants WHERE room_id = ? AND user_id != ?',
        [roomId, userId]
      );
      for (const p of otherParticipants) {
        await createNotification(
          p.user_id,
          'chat',
          `New message from ${req.user.name}`,
          String(message).trim().substring(0, 100),
          '/chat',
          roomId
        );
      }
    }
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message with optional file upload
router.post('/rooms/:roomId/messages/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const message = (req.body.message || '').trim();
    const userId = req.user.id;
    const file = req.file;

    if (!file && !message) {
      return res.status(400).json({ error: 'Message or file is required' });
    }

    const hasAccess = await canAccessRoom(userId, roomId);
    if (!hasAccess) {
      if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(403).json({ error: 'Access denied' });
    }

    const msgId = uuidv4();
    await dbRun(
      'INSERT INTO chat_messages (id, room_id, user_id, message) VALUES (?, ?, ?, ?)',
      [msgId, roomId, userId, message || '(file)']
    );

    if (file) {
      const attId = uuidv4();
      await dbRun(
        'INSERT INTO chat_message_attachments (id, message_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [attId, msgId, file.originalname, file.filename, file.mimetype, file.size]
      );
    }

    const newMessage = await dbGet(
      `SELECT m.*, u.name as user_name
       FROM chat_messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`,
      [msgId]
    );
    newMessage.attachments = await dbAll(
      'SELECT id, file_name, file_path, file_type, file_size FROM chat_message_attachments WHERE message_id = ?',
      [msgId]
    );
    const room = await dbGet('SELECT * FROM chat_rooms WHERE id = ?', [roomId]);
    if (room && room.type === 'dm') {
      const otherParticipants = await dbAll(
        'SELECT user_id FROM chat_room_participants WHERE room_id = ? AND user_id != ?',
        [roomId, userId]
      );
      const preview = message || (req.file ? `Sent ${req.file.originalname}` : '(file)');
      for (const p of otherParticipants) {
        await createNotification(
          p.user_id,
          'chat',
          `New message from ${req.user.name}`,
          preview.substring(0, 100),
          '/chat',
          roomId
        );
      }
    }
    res.status(201).json(newMessage);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Serve chat attachments (authenticated)
router.get('/attachments/:filename', authenticate, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!path.resolve(filePath).startsWith(path.resolve(uploadsDir))) {
    return res.status(403).json({ error: 'Invalid path' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.sendFile(filePath);
});

module.exports = router;
