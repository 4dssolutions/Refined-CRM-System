const db = require('../database');
const { v4: uuidv4 } = require('uuid');

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.getDb().run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Log audit event
const logAudit = async (userId, action, entityType, entityId, changes = null, ipAddress = null) => {
  try {
    const id = uuidv4();
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, userId, action, entityType, entityId, changes ? JSON.stringify(changes) : null, ipAddress]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

// Audit middleware
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override res.json to capture response
    res.json = function(data) {
      // Log after successful operation
      if (res.statusCode < 400 && req.user) {
        const entityId = req.params.id || data?.id || null;
        const changes = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        logAudit(req.user.id, action, entityType, entityId, changes, ipAddress);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Get audit logs
const getAuditLogs = async (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.user_id) {
      query += ' AND al.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.entity_type) {
      query += ' AND al.entity_type = ?';
      params.push(filters.entity_type);
    }
    if (filters.entity_id) {
      query += ' AND al.entity_id = ?';
      params.push(filters.entity_id);
    }
    if (filters.start_date) {
      query += ' AND al.created_at >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND al.created_at <= ?';
      params.push(filters.end_date);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(filters.limit || 100);
    
    db.getDb().all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  logAudit,
  auditMiddleware,
  getAuditLogs
};
