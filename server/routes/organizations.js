const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
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

// Get all organizations
router.get('/', authenticate, checkPermission(PERMISSIONS.ORG_READ), async (req, res) => {
  try {
    const { type, status, parent_id, department } = req.query;
    let query = `
      SELECT o.*, 
        (SELECT COUNT(*) FROM organizations WHERE parent_organization_id = o.id) as child_count,
        parent.name as parent_name
      FROM organizations o
      LEFT JOIN organizations parent ON o.parent_organization_id = parent.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND o.type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (parent_id) {
      query += ' AND o.parent_organization_id = ?';
      params.push(parent_id);
    }
    if (department && req.user.role === 'manager') {
      query += ' AND o.department = ?';
      params.push(department);
    }

    query += ' ORDER BY o.created_at DESC';
    const organizations = await dbAll(query, params);
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get organization by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const organization = await dbGet('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create organization
router.post('/', authenticate, checkPermission(PERMISSIONS.ORG_CREATE), auditMiddleware('create', 'organization'), async (req, res) => {
  try {
    const { name, type, email, phone, website, address, city, state, zip, country, industry, employee_count, annual_revenue, notes, parent_organization_id, department } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO organizations (id, name, type, email, phone, website, address, city, state, zip, country, industry, employee_count, annual_revenue, notes, parent_organization_id, department, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, name, type || 'customer', email, phone, website, address, city, state, zip, country, industry, employee_count, annual_revenue, notes, parent_organization_id, department]
    );

    const organization = await dbGet('SELECT * FROM organizations WHERE id = ?', [id]);
    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update organization
router.put('/:id', authenticate, checkPermission(PERMISSIONS.ORG_UPDATE), auditMiddleware('update', 'organization'), async (req, res) => {
  try {
    const { name, type, email, phone, website, address, city, state, zip, country, industry, employee_count, annual_revenue, notes, status, parent_organization_id, department } = req.body;
    
    await dbRun(
      `UPDATE organizations SET name = ?, type = ?, email = ?, phone = ?, website = ?, address = ?, 
       city = ?, state = ?, zip = ?, country = ?, industry = ?, employee_count = ?, 
       annual_revenue = ?, notes = ?, parent_organization_id = ?, department = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, type, email, phone, website, address, city, state, zip, country, industry, employee_count, annual_revenue, notes, parent_organization_id, department, status, req.params.id]
    );

    const organization = await dbGet('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete organization
router.delete('/:id', authenticate, checkPermission(PERMISSIONS.ORG_DELETE), auditMiddleware('delete', 'organization'), async (req, res) => {
  try {
    await dbRun('DELETE FROM organizations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
