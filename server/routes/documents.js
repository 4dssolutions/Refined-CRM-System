const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { checkPermission, PERMISSIONS } = require('../middleware/permissions');
const { auditMiddleware } = require('../middleware/audit');

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

// Get all documents
router.get('/', authenticate, checkPermission(PERMISSIONS.DOC_READ), async (req, res) => {
  try {
    const { organization_id, project_id, category } = req.query;
    let query = `
      SELECT d.*, 
        u.name as created_by_name,
        o.name as organization_name,
        p.name as project_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN organizations o ON d.organization_id = o.id
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (organization_id) {
      query += ' AND d.organization_id = ?';
      params.push(organization_id);
    }
    if (project_id) {
      query += ' AND d.project_id = ?';
      params.push(project_id);
    }
    if (category) {
      query += ' AND d.category = ?';
      params.push(category);
    }

    query += ' ORDER BY d.created_at DESC';
    const documents = await dbAll(query, params);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
router.get('/:id', authenticate, checkPermission(PERMISSIONS.DOC_READ), async (req, res) => {
  try {
    const document = await dbGet(`
      SELECT d.*, 
        u.name as created_by_name,
        o.name as organization_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN organizations o ON d.organization_id = o.id
      WHERE d.id = ?
    `, [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create document
router.post('/', authenticate, checkPermission(PERMISSIONS.DOC_CREATE), auditMiddleware('create', 'document'), async (req, res) => {
  try {
    const { name, file_path, file_type, file_size, organization_id, project_id, category, description, tags } = req.body;
    
    if (!name || !file_path) {
      return res.status(400).json({ error: 'Name and file path are required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO documents (id, name, file_path, file_type, file_size, organization_id, project_id, category, description, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, file_path, file_type, file_size, organization_id, project_id, category, description, tags, req.user.id]
    );

    const document = await dbGet('SELECT * FROM documents WHERE id = ?', [id]);
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update document
router.put('/:id', authenticate, checkPermission(PERMISSIONS.DOC_UPDATE), auditMiddleware('update', 'document'), async (req, res) => {
  try {
    const { name, category, description, tags } = req.body;
    
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(tags);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, params);
    const document = await dbGet('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', authenticate, checkPermission(PERMISSIONS.DOC_DELETE), auditMiddleware('delete', 'document'), async (req, res) => {
  try {
    await dbRun('DELETE FROM documents WHERE id = ?', [req.params.id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
