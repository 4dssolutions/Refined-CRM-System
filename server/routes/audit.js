const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAuditLogs } = require('../middleware/audit');

// Get audit logs (admin and executive only)
router.get('/', authenticate, authorize('admin', 'executive'), async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      entity_type: req.query.entity_type,
      entity_id: req.query.entity_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: parseInt(req.query.limit) || 100
    };
    
    const logs = await getAuditLogs(filters);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
