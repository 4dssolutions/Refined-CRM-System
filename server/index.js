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
app.get('/test', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('html').send(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Test</title></head><body style="margin:0;min-height:100vh;background:#f5f5f5;font-family:sans-serif;padding:2rem">' +
    '<div style="padding:10px 16px;background:#2563eb;color:white;margin:-2rem -2rem 2rem -2rem">Refined CRM</div>' +
    '<h1>Server is working</h1><p>If you see this, the server is reachable.</p>' +
    '<p><a href="/?t=' + Date.now() + '">Open app (cache-bust)</a></p></body></html>'
  );
});

if (hasBuild) {
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/static/')) {
      return res.status(404).type('text/plain').send('Static file not found. Check that the client build completed on deploy.');
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    let cssHref = './static/css/main.b600162f.css';
    let jsSrc = './static/js/main.3cff4255.js';
    try {
      const manifestPath = path.join(buildPath, 'asset-manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.entrypoints && manifest.entrypoints[0]) cssHref = manifest.entrypoints[0];
        if (manifest.entrypoints && manifest.entrypoints[1]) jsSrc = manifest.entrypoints[1];
      }
    } catch (e) { }
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"/>' +
      '<link rel="icon" href="/favicon.svg"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
      '<title>Refined CRM</title><link href="' + cssHref + '" rel="stylesheet"/></head>' +
      '<body style="margin:0;min-height:100vh;background:#f5f5f5">' +
      '<div style="padding:10px 16px;background:#2563eb;color:white;font-family:sans-serif;font-size:14px">Refined CRM</div>' +
      '<noscript>You need to enable JavaScript to run this app.</noscript>' +
      '<div id="root"><p style="font-family:sans-serif;padding:2rem;text-align:center">Loading…</p></div>' +
      '<script src="' + jsSrc + '" defer></script></body></html>';
    res.type('html').send(html);
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
  if (hasBuild) {
    const staticDir = path.join(buildPath, 'static', 'js');
    if (fs.existsSync(staticDir)) {
      console.log('Static JS files:', fs.readdirSync(staticDir).join(', '));
    } else {
      console.warn('client/build/static/js not found – script requests may 404');
    }
  }
});
