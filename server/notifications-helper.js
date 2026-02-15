const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.getDb().run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const createNotification = async (userId, type, title, message, link, entityId = null) => {
  try {
    const id = uuidv4();
    await dbRun(
      'INSERT INTO notifications (id, user_id, type, title, message, link, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, type, title, message || '', link, entityId]
    );
    return id;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};

module.exports = { createNotification };
