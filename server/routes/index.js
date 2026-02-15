const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// Helper function to promisify db operations
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

// ========== CUSTOMERS ==========
router.get('/customers', async (req, res) => {
  try {
    const customers = await dbAll('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const id = uuidv4();
    const { name, email, phone, company, address, city, state, zip, country } = req.body;
    await dbRun(
      `INSERT INTO customers (id, name, email, phone, company, address, city, state, zip, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, phone, company, address, city, state, zip, country]
    );
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const { name, email, phone, company, address, city, state, zip, country, status } = req.body;
    await dbRun(
      `UPDATE customers SET name = ?, email = ?, phone = ?, company = ?, address = ?, 
       city = ?, state = ?, zip = ?, country = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, email, phone, company, address, city, state, zip, country, status, req.params.id]
    );
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SUPPLIERS ==========
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await dbAll('SELECT * FROM suppliers ORDER BY created_at DESC');
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const id = uuidv4();
    const { name, email, phone, company, address, city, state, zip, country } = req.body;
    await dbRun(
      `INSERT INTO suppliers (id, name, email, phone, company, address, city, state, zip, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email, phone, company, address, city, state, zip, country]
    );
    const supplier = await dbGet('SELECT * FROM suppliers WHERE id = ?', [id]);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, email, phone, company, address, city, state, zip, country, status } = req.body;
    await dbRun(
      `UPDATE suppliers SET name = ?, email = ?, phone = ?, company = ?, address = ?, 
       city = ?, state = ?, zip = ?, country = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, email, phone, company, address, city, state, zip, country, status, req.params.id]
    );
    const supplier = await dbGet('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PRODUCTS ==========
router.get('/products', async (req, res) => {
  try {
    const products = await dbAll(`
      SELECT p.*, s.name as supplier_name 
      FROM products p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      ORDER BY p.created_at DESC
    `);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const id = uuidv4();
    const { sku, name, description, category, price, cost, stock_quantity, min_stock_level, supplier_id } = req.body;
    await dbRun(
      `INSERT INTO products (id, sku, name, description, category, price, cost, stock_quantity, min_stock_level, supplier_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sku, name, description, category, price, cost, stock_quantity, min_stock_level, supplier_id]
    );
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { sku, name, description, category, price, cost, stock_quantity, min_stock_level, supplier_id, status } = req.body;
    await dbRun(
      `UPDATE products SET sku = ?, name = ?, description = ?, category = ?, price = ?, 
       cost = ?, stock_quantity = ?, min_stock_level = ?, supplier_id = ?, status = ?, 
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [sku, name, description, category, price, cost, stock_quantity, min_stock_level, supplier_id, status, req.params.id]
    );
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ORDERS ==========
router.get('/orders', async (req, res) => {
  try {
    const orders = await dbAll(`
      SELECT o.*, c.name as customer_name, c.email as customer_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
    `);
    
    // Get order items for each order
    for (let order of orders) {
      order.items = await dbAll(`
        SELECT oi.*, p.name as product_name, p.sku
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await dbGet(`
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [req.params.id]);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    order.items = await dbAll(`
      SELECT oi.*, p.name as product_name, p.sku
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const id = uuidv4();
    const orderNumber = `ORD-${Date.now()}`;
    const { customer_id, shipping_address, notes, items } = req.body;
    
    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      const product = await dbGet('SELECT price FROM products WHERE id = ?', [item.product_id]);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }
      totalAmount += product.price * item.quantity;
    }
    
    // Create order
    await dbRun(
      `INSERT INTO orders (id, order_number, customer_id, shipping_address, notes, total_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, orderNumber, customer_id, shipping_address, notes, totalAmount]
    );
    
    // Create order items and update inventory
    for (const item of items) {
      const product = await dbGet('SELECT price, stock_quantity FROM products WHERE id = ?', [item.product_id]);
      const unitPrice = product.price;
      const totalPrice = unitPrice * item.quantity;
      
      const itemId = uuidv4();
      await dbRun(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, id, item.product_id, item.quantity, unitPrice, totalPrice]
      );
      
      // Update stock
      const newStock = product.stock_quantity - item.quantity;
      await dbRun(
        'UPDATE products SET stock_quantity = ? WHERE id = ?',
        [newStock, item.product_id]
      );
    }
    
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = await dbAll(`
      SELECT oi.*, p.name as product_name, p.sku
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [id]);
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    const { status, shipping_address, notes } = req.body;
    const updates = [];
    const params = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'shipped') {
        updates.push('shipped_at = CURRENT_TIMESTAMP');
      }
      if (status === 'delivered') {
        updates.push('delivered_at = CURRENT_TIMESTAMP');
      }
    }
    if (shipping_address !== undefined) {
      updates.push('shipping_address = ?');
      params.push(shipping_address);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    
    await dbRun(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CONTACTS/INTERACTIONS ==========
router.get('/contacts', async (req, res) => {
  try {
    const { customer_id, supplier_id } = req.query;
    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];
    
    if (customer_id) {
      query += ' AND customer_id = ?';
      params.push(customer_id);
    }
    if (supplier_id) {
      query += ' AND supplier_id = ?';
      params.push(supplier_id);
    }
    
    query += ' ORDER BY date DESC';
    const contacts = await dbAll(query, params);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const id = uuidv4();
    const { customer_id, supplier_id, type, subject, notes, created_by } = req.body;
    await dbRun(
      `INSERT INTO contacts (id, customer_id, supplier_id, type, subject, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, customer_id, supplier_id, type, subject, notes, created_by]
    );
    const contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [id]);
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import new route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const taskRoutes = require('./tasks');
const projectRoutes = require('./projects');
const meetingRoutes = require('./meetings');
const calendarRoutes = require('./calendar');
const organizationRoutes = require('./organizations');
const auditRoutes = require('./audit');
const documentRoutes = require('./documents');
const workflowRoutes = require('./workflows');
const emailRoutes = require('./emails');
const chatRoutes = require('./chat');
const notificationRoutes = require('./notifications');
const branchRoutes = require('./branches');
const callRoutes = require('./calls');

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/projects', projectRoutes);
router.use('/meetings', meetingRoutes);
router.use('/calendar', calendarRoutes);
router.use('/organizations', organizationRoutes);
router.use('/audit', auditRoutes);
router.use('/documents', documentRoutes);
router.use('/workflows', workflowRoutes);
router.use('/emails', emailRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/branches', branchRoutes);
router.use('/calls', callRoutes);

// ========== DASHBOARD STATS ==========
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {
      totalCustomers: (await dbGet('SELECT COUNT(*) as count FROM customers WHERE status = "active"')).count,
      totalSuppliers: (await dbGet('SELECT COUNT(*) as count FROM suppliers WHERE status = "active"')).count,
      totalProducts: (await dbGet('SELECT COUNT(*) as count FROM products WHERE status = "active"')).count,
      totalOrders: (await dbGet('SELECT COUNT(*) as count FROM orders')).count,
      pendingOrders: (await dbGet('SELECT COUNT(*) as count FROM orders WHERE status = "pending"')).count,
      lowStockProducts: (await dbAll('SELECT * FROM products WHERE stock_quantity <= min_stock_level AND status = "active"')),
      recentOrders: await dbAll(`
        SELECT o.*, c.name as customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `),
      totalRevenue: (await dbGet('SELECT SUM(total_amount) as total FROM orders WHERE status = "delivered"')).total || 0
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DASHBOARD ACTIVITY FEED ==========
router.get('/dashboard/activity', authenticate, async (req, res) => {
  try {
    // Tasks (recent, assigned to or created by user)
    const tasks = await dbAll(`
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at,
             u.name as assigned_to_name, u2.name as created_by_name, 'task' as item_type
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      ORDER BY t.created_at DESC
      LIMIT 20
    `);

    // Meetings (upcoming + recent)
    const meetings = await dbAll(`
      SELECT m.id, m.title, m.description, m.start_time, m.end_time, m.location,
             m.status, m.meeting_type, m.created_at,
             u.name as organizer_name, 'meeting' as item_type
      FROM meetings m
      LEFT JOIN users u ON m.organizer_id = u.id
      ORDER BY m.start_time DESC
      LIMIT 15
    `);

    // Calls with notes
    const calls = await dbAll(`
      SELECT c.id, c.contact_name, c.contact_phone, c.direction, c.outcome,
             c.duration, c.notes, c.started_at, c.created_at,
             u.name as caller_name, 'call' as item_type
      FROM calls c
      LEFT JOIN users u ON c.caller_id = u.id
      WHERE c.notes IS NOT NULL AND c.notes != ''
      ORDER BY c.created_at DESC
      LIMIT 15
    `);

    // Recent unread emails for the user
    const emails = await dbAll(`
      SELECT e.id, e.subject, e.body, e.is_read, e.created_at,
             u.name as sender_name, u.email as sender_email,
             COALESCE(e.recipient_email, u2.email) as recipient_email,
             CASE WHEN e.recipient_email IS NOT NULL THEN e.recipient_email ELSE u2.name END as recipient_name,
             'email' as item_type
      FROM emails e
      LEFT JOIN users u ON e.sender_id = u.id
      LEFT JOIN users u2 ON e.recipient_id = u2.id
      WHERE e.recipient_id = ? OR e.sender_id = ?
      ORDER BY e.created_at DESC
      LIMIT 10
    `, [req.user.id, req.user.id]);

    // Recent chat messages (from rooms user participates in)
    const chatMessages = await dbAll(`
      SELECT cm.id, cm.message, cm.created_at, 
             u.name as sender_name, cr.name as room_name, cr.type as room_type,
             'chat' as item_type
      FROM chat_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      LEFT JOIN chat_rooms cr ON cm.room_id = cr.id
      LEFT JOIN chat_room_participants crp ON cr.id = crp.room_id AND crp.user_id = ?
      WHERE (cr.type = 'channel' OR crp.user_id IS NOT NULL)
        AND cm.message IS NOT NULL AND cm.message != ''
      ORDER BY cm.created_at DESC
      LIMIT 10
    `, [req.user.id]);

    // Projects
    const projects = await dbAll(`
      SELECT p.id, p.name as title, p.description, p.status, p.priority, p.end_date as due_date,
             p.created_at, u.name as owner_name, 'project' as item_type
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    // Leads
    let leads = [];
    try {
      leads = await dbAll(`
        SELECT l.*, u.name as assigned_to_name, 'lead' as item_type
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        ORDER BY l.created_at DESC
        LIMIT 20
      `);
    } catch (e) {
      // leads table may not exist yet
    }

    res.json({ tasks, meetings, calls, emails, chatMessages, projects, leads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LEADS CRUD ==========
router.get('/leads', authenticate, async (req, res) => {
  try {
    const leads = await dbAll(`
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ORDER BY l.created_at DESC
    `);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads', authenticate, async (req, res) => {
  try {
    const { name, email, phone, company, source, status, priority, notes, assigned_to, value } = req.body;
    if (!name) return res.status(400).json({ error: 'Lead name is required' });
    const id = require('uuid').v4();
    await dbRun(
      `INSERT INTO leads (id, name, email, phone, company, source, status, priority, notes, assigned_to, value, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email || null, phone || null, company || null, source || 'direct', status || 'new', priority || 'medium', notes || null, assigned_to || null, value || 0, req.user.id]
    );
    const lead = await dbGet(`SELECT l.*, u.name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = ?`, [id]);
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/leads/:id', authenticate, async (req, res) => {
  try {
    const { name, email, phone, company, source, status, priority, notes, assigned_to, value } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (source !== undefined) { updates.push('source = ?'); params.push(source); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to || null); }
    if (value !== undefined) { updates.push('value = ?'); params.push(value); }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    await dbRun(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
    const lead = await dbGet(`SELECT l.*, u.name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = ?`, [req.params.id]);
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/leads/:id', authenticate, async (req, res) => {
  try {
    await dbRun('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
