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

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, manager_id } = req.query;
    let query = `
      SELECT p.*, 
        u.name as manager_name,
        u2.name as created_by_name,
        o.name as organization_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_tasks
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN users u2 ON p.created_by = u2.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (manager_id) {
      query += ' AND p.manager_id = ?';
      params.push(manager_id);
    }

    query += ' ORDER BY p.created_at DESC';
    const projects = await dbAll(query, params);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await dbGet(`
      SELECT p.*, 
        u.name as manager_name,
        u2.name as created_by_name,
        o.name as organization_name
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN users u2 ON p.created_by = u2.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, status, priority, start_date, end_date, budget, manager_id, organization_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO projects (id, name, description, status, priority, start_date, end_date, budget, manager_id, organization_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, status || 'planning', priority || 'medium', start_date, end_date, budget || 0, manager_id, organization_id, req.user.id]
    );

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, status, priority, start_date, end_date, budget, manager_id, organization_id, progress } = req.body;
    
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
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }
    if (budget !== undefined) {
      updates.push('budget = ?');
      params.push(budget);
    }
    if (manager_id !== undefined) {
      updates.push('manager_id = ?');
      params.push(manager_id);
    }
    if (organization_id !== undefined) {
      updates.push('organization_id = ?');
      params.push(organization_id);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      params.push(progress);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await dbRun(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await dbRun('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
