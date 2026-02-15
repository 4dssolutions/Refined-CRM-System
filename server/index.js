const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const routes = require('./routes');
const { startAutomation } = require('./automation');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check (no auth) – so frontend can verify backend is up
app.get('/api/health', (req, res) => {
  res.json({ ok: db.isReady(), message: db.isReady() ? 'OK' : 'Database unavailable' });
});

// Require DB for all other API routes (return 503 when MySQL is down)
app.use('/api', (req, res, next) => {
  if (!db.isReady()) {
    return res.status(503).json({ error: 'Database unavailable', message: 'MySQL is not running. Start MySQL (e.g. XAMPP/WAMP) or check .env DB_* settings.' });
  }
  next();
});

// Routes
app.use('/api', routes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Initialize database (optional: server still starts if MySQL is down)
db.init()
  .then(() => {
    startAutomation();
    console.log('Database connected.');
  })
  .catch((err) => {
    console.error('Database unavailable:', err.message);
    console.log('Server will start anyway. API calls will return 503 until MySQL is running.');
  });

// Always start HTTP server so frontend and /api/health work
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
