const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./database');
const routes = require('./routes');
const { startAutomation } = require('./automation');

const app = express();
const PORT = process.env.PORT || 5000;

const buildPath = path.join(__dirname, '../client/build');
const hasBuild = fs.existsSync(buildPath) && fs.existsSync(path.join(buildPath, 'index.html'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check (no auth) – so frontend can verify backend is up
app.get('/api/health', (req, res) => {
  res.json({
    ok: db.isReady(),
    message: db.isReady() ? 'OK' : 'Database unavailable',
    build: hasBuild ? 'present' : 'missing',
    nodeEnv: process.env.NODE_ENV || '(not set)',
  });
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

// Serve React app when build folder exists (works even if NODE_ENV isn’t set on Render)
if (hasBuild) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Production mode but client/build not found. Run: npm run build');
  }
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.type('html').status(200).send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Refined CRM</title></head><body style="font-family:sans-serif;max-width:600px;margin:2rem auto;padding:1rem;">
        <h1>React build not found</h1>
        <p>The server is running but <code>client/build</code> is missing. The client build step may have failed on deploy.</p>
        <p><strong>Check:</strong> In Render → your service → <strong>Logs</strong> (build step). Look for errors during <code>npm run build</code> in the client. Fix any errors and redeploy.</p>
        <p><a href="/api/health">/api/health</a> – backend status</p>
      </body></html>
    `);
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
  console.log(`React build: ${hasBuild ? 'found (will serve app)' : 'NOT FOUND (run: npm run build in client)'}`);
});
