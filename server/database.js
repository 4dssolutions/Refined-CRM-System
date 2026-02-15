require('dotenv').config();
const path = require('path');
const fs = require('fs');

const DB_USE_SQLITE = process.env.DB_USE_SQLITE === 'true' || process.env.DB_USE_SQLITE === '1';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'refined_crm.sqlite');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'refined_crm';

let pool = null;
let dbMode = null; // 'mysql' | 'sqlite'

// ---- MySQL ----
const mysql = require('mysql2/promise');

function makeDbWrapper(p) {
  return {
    run(query, params, callback) {
      const args = typeof params === 'function' ? [] : (params || []);
      const cb = typeof params === 'function' ? params : callback;
      p.execute(query, args)
        .then(([result]) => {
          const isResultSet = Array.isArray(result);
          const lastID = isResultSet ? 0 : (result.insertId != null ? result.insertId : 0);
          const changes = isResultSet ? 0 : (result.affectedRows != null ? result.affectedRows : 0);
          const ctx = { lastID, changes };
          cb.call(ctx, null);
        })
        .catch((err) => cb(err));
    },
    all(query, params, callback) {
      const args = typeof params === 'function' ? [] : (params || []);
      const cb = typeof params === 'function' ? params : callback;
      p.execute(query, args)
        .then(([rows]) => cb(null, Array.isArray(rows) ? rows : []))
        .catch((err) => cb(err));
    },
    get(query, params, callback) {
      const args = typeof params === 'function' ? [] : (params || []);
      const cb = typeof params === 'function' ? params : callback;
      p.execute(query, args)
        .then(([rows]) => {
          const arr = Array.isArray(rows) ? rows : [];
          cb(null, arr.length > 0 ? arr[0] : undefined);
        })
        .catch((err) => cb(err));
    },
  };
}

// ---- SQLite (callback wrapper for sqlite3 async API) ----
function makeSqliteWrapper(db) {
  return {
    run(query, params, callback) {
      const args = typeof params === 'function' ? [] : (params || []);
      const cb = typeof params === 'function' ? params : callback;
      db.run(query, args, function (err) {
        if (err) return cb(err);
        cb.call({ lastID: this.lastID, changes: this.changes }, null);
      });
    },
    all(query, params, callback) {
      const args = typeof params === 'function' ? [] : (params || []);
      const cb = typeof params === 'function' ? params : callback;
      db.all(query, args, (err, rows) => {
        if (err) return cb(err);
        cb(null, Array.isArray(rows) ? rows : []);
      });
    },
    get(query, params, callback) {
      const args = typeof params === 'function' ? [] : (params || []);
      const cb = typeof params === 'function' ? params : callback;
      db.get(query, args, (err, row) => {
        if (err) return cb(err);
        cb(null, row !== undefined ? row : undefined);
      });
    },
  };
}

function getDbInternal() {
  if (!pool) throw new Error('Database not initialized');
  return dbMode === 'sqlite' ? makeSqliteWrapper(pool) : makeDbWrapper(pool);
}

// ---- Init: prefer SQLite if requested, else try MySQL then fallback to SQLite ----
const init = async () => {
  if (DB_USE_SQLITE) {
    await initSqlite();
    return;
  }
  try {
    await initMySQL();
  } catch (err) {
    console.error('MySQL unavailable:', err.message);
    console.log('Using SQLite for local data. Start MySQL for production or set DB_USE_SQLITE=true.');
    await initSqlite();
  }
};

async function initMySQL() {
  const tempPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 1,
  });
  const tempConn = await tempPool.getConnection();
  await tempConn.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  tempConn.release();
  await tempPool.end();

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  dbMode = 'mysql';
  console.log('Connected to MySQL database');
  await createTablesMySQL();
}

async function initSqlite() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const sqlite3 = require('sqlite3').verbose();
  await new Promise((resolve, reject) => {
    pool = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  dbMode = 'sqlite';
  console.log('Using SQLite database at', DB_PATH);
  await createTablesSqlite();
  await addMissingColumnsSqlite();
  await createDefaultAdmin();
  await ensureExternalPlaceholder();
}

const TABLE_DEFS = [
  `CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(100),
    company VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(100),
    company VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    stock_quantity INT DEFAULT 0,
    min_stock_level INT DEFAULT 0,
    supplier_id VARCHAR(36),
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount REAL DEFAULT 0,
    shipping_address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    shipped_at DATETIME NULL,
    delivered_at DATETIME NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36),
    supplier_id VARCHAR(36),
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    notes TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  )`,
  `CREATE TABLE IF NOT EXISTS automation_rules (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    conditions TEXT,
    actions TEXT,
    enabled INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    department VARCHAR(100),
    phone VARCHAR(100),
    avatar VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    two_factor_enabled INT DEFAULT 0,
    last_login DATETIME NULL,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    branch_id VARCHAR(36),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'customer',
    email VARCHAR(255),
    phone VARCHAR(100),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    industry VARCHAR(100),
    employee_count VARCHAR(50),
    annual_revenue VARCHAR(50),
    parent_organization_id VARCHAR(36),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_organization_id) REFERENCES organizations(id)
  )`,
  `CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(50) DEFAULT 'medium',
    start_date DATE NULL,
    end_date DATE NULL,
    budget REAL DEFAULT 0,
    manager_id VARCHAR(36),
    organization_id VARCHAR(36),
    progress INT DEFAULT 0,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    due_date DATETIME NULL,
    project_id VARCHAR(36),
    assigned_to VARCHAR(36),
    created_by VARCHAR(36),
    completed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    location VARCHAR(255),
    meeting_type VARCHAR(50) DEFAULT 'internal',
    organizer_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS meeting_participants (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'invited',
    FOREIGN KEY (meeting_id) REFERENCES meetings(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    event_type VARCHAR(50) DEFAULT 'meeting',
    location VARCHAR(255),
    user_id VARCHAR(36),
    color VARCHAR(20) DEFAULT '#000000',
    all_day INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(36),
    changes TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    organization_id VARCHAR(36),
    project_id VARCHAR(36),
    user_id VARCHAR(36),
    category VARCHAR(100),
    description TEXT,
    tags TEXT,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS workflows (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100) NOT NULL,
    trigger_conditions TEXT,
    actions TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS custom_entities (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    schema TEXT,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS custom_entity_data (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    data TEXT,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS chat_rooms (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'channel',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS chat_room_participants (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS chat_message_attachments (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500) NOT NULL,
    entity_id VARCHAR(36),
    is_read INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(36) PRIMARY KEY,
    caller_id VARCHAR(36) NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(100) NOT NULL,
    contact_type VARCHAR(50) DEFAULT 'customer',
    contact_id VARCHAR(36),
    direction VARCHAR(50) DEFAULT 'outbound',
    status VARCHAR(50) DEFAULT 'completed',
    outcome VARCHAR(50) DEFAULT 'connected',
    duration INT DEFAULT 0,
    notes TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caller_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(100),
    company VARCHAR(255),
    source VARCHAR(50) DEFAULT 'direct',
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(50) DEFAULT 'medium',
    notes TEXT,
    value REAL DEFAULT 0,
    assigned_to VARCHAR(36),
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_permissions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    section VARCHAR(100) NOT NULL,
    enabled INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, section)
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS emails (
    id VARCHAR(36) PRIMARY KEY,
    sender_id VARCHAR(36) NOT NULL,
    recipient_id VARCHAR(36) NOT NULL,
    recipient_email VARCHAR(255) NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    is_read INT DEFAULT 0,
    is_starred INT DEFAULT 0,
    is_archived INT DEFAULT 0,
    folder VARCHAR(50) DEFAULT 'inbox',
    parent_email_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (parent_email_id) REFERENCES emails(id)
  )`,
];

async function createTablesMySQL() {
  const conn = await pool.getConnection();
  try {
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    const mysqlTables = TABLE_DEFS.map((s) =>
      s
        .replace(/\bREAL\b/g, 'DOUBLE')
        .replace(/UNIQUE\(user_id, section\)/, 'UNIQUE KEY unique_user_section (user_id, section)')
        .replace(/\bbody TEXT\b/, 'body LONGTEXT')
        .replace(/updated_at DATETIME DEFAULT CURRENT_TIMESTAMP(?!\s+ON UPDATE)/g, 'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    );
    for (const sql of mysqlTables) {
      await conn.execute(sql);
    }
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database tables created successfully');
    await addMissingColumnsMySQL(conn);
    await createDefaultAdmin();
    await ensureExternalPlaceholder();
  } finally {
    conn.release();
  }
}

function createTablesSqlite() {
  return new Promise((resolve, reject) => {
    pool.run('PRAGMA foreign_keys = OFF', (err) => {
      if (err) return reject(err);
      let i = 0;
      const next = () => {
        if (i >= TABLE_DEFS.length) {
          pool.run('PRAGMA foreign_keys = ON', (err2) => {
            if (err2) return reject(err2);
            console.log('Database tables created successfully');
            resolve();
          });
          return;
        }
        pool.run(TABLE_DEFS[i], (err2) => {
          if (err2) return reject(err2);
          i++;
          next();
        });
      };
      next();
    });
  });
}

async function addMissingColumnsMySQL(conn) {
  try {
    const [emailCols] = await conn.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [DB_NAME, 'emails']
    );
    const hasRecipientEmail = (emailCols || []).some((c) => c.COLUMN_NAME === 'recipient_email');
    if (!hasRecipientEmail) {
      await conn.execute('ALTER TABLE emails ADD COLUMN recipient_email VARCHAR(255) NULL');
      console.log('Added recipient_email to emails');
    }
  } catch (e) {
    console.warn('addMissingColumns:', e.message);
  }
}

function addMissingColumnsSqlite() {
  return new Promise((resolve) => {
    pool.all('PRAGMA table_info(emails)', [], (err, rows) => {
      if (err) {
        console.warn('addMissingColumnsSqlite:', err.message);
        return resolve();
      }
      const hasRecipientEmail = (rows || []).some((r) => r.name === 'recipient_email');
      if (!hasRecipientEmail) {
        pool.run('ALTER TABLE emails ADD COLUMN recipient_email VARCHAR(255) NULL', (err2) => {
          if (!err2) console.log('Added recipient_email to emails');
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

const createDefaultAdmin = () => {
  return new Promise((resolve) => {
    const db = getDbInternal();
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
      if (err) {
        console.error('Error checking users:', err);
        resolve();
        return;
      }
      const count = row ? Number(row.count || 0) : 0;
      if (count === 0) {
        const bcrypt = require('bcryptjs');
        const { v4: uuidv4 } = require('uuid');
        const adminId = uuidv4();
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(
          'INSERT INTO users (id, email, password, name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
          [adminId, 'admin@company.com', hashedPassword, 'System Administrator', 'admin', 'active'],
          function (err) {
            if (err) {
              console.error('Error creating default admin:', err);
            } else {
              console.log('Default admin user created: admin@company.com / admin123');
            }
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  });
};

const ensureExternalPlaceholder = () => {
  return new Promise((resolve) => {
    const db = getDbInternal();
    db.get("SELECT id FROM users WHERE id = 'external-placeholder'", [], (err, row) => {
      if (err || row) {
        resolve();
        return;
      }
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('unused', 10);
      db.run(
        "INSERT INTO users (id, email, password, name, role, status) VALUES ('external-placeholder', 'external@crm.local', ?, 'External Recipient', 'guest', 'active')",
        [hash],
        () => resolve()
      );
    });
  });
};

const isReady = () => !!pool;

const getDb = () => {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return getDbInternal();
};

const close = () => {
  if (!pool) return Promise.resolve();
  if (dbMode === 'sqlite') {
    return new Promise((resolve) => {
      pool.close((err) => {
        if (err) console.warn('SQLite close:', err.message);
        pool = null;
        dbMode = null;
        console.log('Database connection closed');
        resolve();
      });
    });
  }
  return pool.end().then(() => {
    console.log('Database connection closed');
    pool = null;
    dbMode = null;
  });
};

module.exports = {
  init,
  isReady,
  getDb,
  close,
};
