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

// Get all tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { project_id, assigned_to, status } = req.query;
    let query = `
      SELECT t.*, 
        u.name as assigned_to_name,
        u2.name as created_by_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';
    const tasks = await dbAll(query, params);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await dbGet(`
      SELECT t.*, 
        u.name as assigned_to_name,
        u2.name as created_by_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `, [req.params.id]);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, project_id, assigned_to } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO tasks (id, title, description, status, priority, due_date, project_id, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, status || 'todo', priority || 'medium', due_date, project_id, assigned_to, req.user.id]
    );

    if (assigned_to && assigned_to !== req.user.id) {
      await createNotification(
        assigned_to,
        'task',
        `New task assigned: ${title}`,
        description ? description.substring(0, 100) : '',
        '/tasks',
        id
      );
    }
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [id]);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, project_id, assigned_to } = req.body;
    
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
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      } else {
        updates.push('completed_at = NULL');
      }
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date);
    }
    if (project_id !== undefined) {
      updates.push('project_id = ?');
      params.push(project_id);
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    const existingTask = await dbGet('SELECT title, description, assigned_to FROM tasks WHERE id = ?', [req.params.id]);
    await dbRun(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (assigned_to && assigned_to !== req.user.id && assigned_to !== existingTask?.assigned_to) {
      await createNotification(
        assigned_to,
        'task',
        `Task assigned: ${task.title}`,
        task.description ? task.description.substring(0, 100) : '',
        '/tasks',
        task.id
      );
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await dbRun('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
