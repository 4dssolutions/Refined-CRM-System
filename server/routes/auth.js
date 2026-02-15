const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../database');
const { authenticate, authorize, JWT_SECRET } = require('../middleware/auth');
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

// Login (accepts email or username)
router.post('/login', async (req, res) => {
  try {
    const { email, password, login } = req.body;
    const loginValue = login || email;
    
    if (!loginValue || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find by email or name (username)
    const user = await dbGet(
      'SELECT * FROM users WHERE email = ? OR LOWER(name) = LOWER(?)',
      [loginValue.trim(), loginValue.trim()]
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department, branch_id: user.branch_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = user;
    
    // Fetch user section permissions
    const perms = await dbAll('SELECT section, enabled FROM user_permissions WHERE user_id = ?', [user.id]);
    const permissions = {};
    // Default all to true; admin always has full access
    if (user.role === 'admin') {
      // admin gets everything
    } else {
      perms.forEach(p => { permissions[p.section] = !!p.enabled; });
    }
    userWithoutPassword.permissions = permissions;
    
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await dbGet(
      `SELECT u.id, u.email, u.name, u.role, u.department, u.phone, u.avatar, u.status, u.branch_id, u.created_at, b.name as branch_name
       FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.id = ?`,
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Fetch user section permissions
    const perms = await dbAll('SELECT section, enabled FROM user_permissions WHERE user_id = ?', [req.user.id]);
    const permissions = {};
    if (user.role !== 'admin') {
      perms.forEach(p => { permissions[p.section] = !!p.enabled; });
    }
    user.permissions = permissions;
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot password - send reset link to registered email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await dbGet('SELECT id, email, name FROM users WHERE email = ?', [email.trim()]);
    if (!user) {
      // Don't reveal if email exists - always return success
      return res.json({ message: 'If that email is registered, you will receive a password reset link shortly.' });
    }

    if (!isConfigured()) {
      return res.status(503).json({ error: 'Email service is not configured. Contact your administrator to set up SMTP.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const id = uuidv4();

    await dbRun(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [id, user.id, token, expiresAt.toISOString()]
    );

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: 'Refined CRM - Password Reset',
      text: `Hi ${user.name},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.\n\n— Refined CRM`,
      html: `<p>Hi ${user.name},</p><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p><p>— Refined CRM</p>`
    });

    res.json({ message: 'If that email is registered, you will receive a password reset link shortly.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Unable to send reset email. Please try again later.' });
  }
});

// Reset password - with token from email link
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid token and new password (min 6 characters) are required' });
    }

    const row = await dbGet(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime("now")',
      [token]
    );
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, row.user_id]);
    await dbRun('DELETE FROM password_reset_tokens WHERE id = ?', [row.id]);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to reset password. Please try again.' });
  }
});

// Register new user (admin only)
router.post('/register', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, password, name, role, department, phone } = req.body;
    
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
      `INSERT INTO users (id, email, password, name, role, department, phone, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, email, hashedPassword, name, role || 'clerk', department, phone, req.user.id]
    );

    const user = await dbGet('SELECT id, email, name, role, department, phone, status, created_at FROM users WHERE id = ?', [id]);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
