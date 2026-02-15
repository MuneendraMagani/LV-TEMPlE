require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const sessions = new Map(); // token -> { userId, role, expiry }
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function getAuthToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function getSession(req) {
  const token = getAuthToken(req);
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || Date.now() > s.expiry) {
    if (s) sessions.delete(token);
    return null;
  }
  return s;
}

function isAuthenticated(req) {
  return getSession(req) !== null;
}

function isSuperAdmin(req) {
  const s = getSession(req);
  return s && s.role === 'SUPER_ADMIN';
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function log(req, res, status) {
  const method = req.method;
  const url = req.url;
  console.log([method, url, status].join(' '));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = url.pathname.replace(/\/+$/, '') || '/';

  // API: POST login
  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const { username, password } = await parseBody(req);
      const result = await db.verifyAdmin(username, password);
      if (result.ok) {
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, {
          userId: result.userId,
          role: result.role,
          expiry: Date.now() + SESSION_DURATION_MS,
        });
        log(req, res, 200);
        sendJson(res, 200, { token, role: result.role });
      } else {
        log(req, res, 401);
        sendJson(res, 401, { error: 'Invalid username or password' });
      }
    } catch (e) {
      log(req, res, 400);
      sendJson(res, 400, { error: 'Invalid request' });
    }
    return;
  }

  // API: GET pujas (public)
  if (pathname === '/api/pujas' && req.method === 'GET') {
    try {
      const data = await db.getPujas();
      log(req, res, 200);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(data));
    } catch (e) {
      console.error('GET /api/pujas error:', e.message);
      log(req, res, 500);
      sendJson(res, 500, { error: 'Failed to load pujas' });
    }
    return;
  }

  // API: POST add puja (admin only)
  if (pathname === '/api/pujas' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      sendJson(res, 401, { error: 'Login required' });
      return;
    }
    try {
      const puja = await parseBody(req);
      const created = await db.addPuja(puja);
      log(req, res, 201);
      sendJson(res, 201, created);
    } catch (e) {
      console.error('POST /api/pujas (add puja) error:', e.message);
      log(req, res, 400);
      sendJson(res, 400, { error: e.message || 'Invalid request' });
    }
    return;
  }

  // API: DELETE puja (admin only)
  if (pathname.startsWith('/api/pujas/') && req.method === 'DELETE') {
    if (!isAuthenticated(req)) {
      sendJson(res, 401, { error: 'Login required' });
      return;
    }
    const id = pathname.replace(/^\/api\/pujas\//, '');
    try {
      await db.deletePuja(id);
      sendJson(res, 200, { success: true });
    } catch (e) {
      sendJson(res, 500, { error: 'Delete failed' });
    }
    return;
  }

  // API: GET admins (super admin only)
  if (pathname === '/api/admins' && req.method === 'GET') {
    if (!isSuperAdmin(req)) {
      sendJson(res, 403, { error: 'Super admin only' });
      return;
    }
    try {
      const admins = await db.getAdmins();
      sendJson(res, 200, admins);
    } catch (e) {
      sendJson(res, 500, { error: 'Failed to load admins' });
    }
    return;
  }

  // API: POST admins (super admin only) - add new admin
  if (pathname === '/api/admins' && req.method === 'POST') {
    if (!isSuperAdmin(req)) {
      sendJson(res, 403, { error: 'Super admin only' });
      return;
    }
    try {
      const { username, password } = await parseBody(req);
      const admin = await db.addAdmin(username, password, db.ROLES.ADMIN);
      sendJson(res, 201, admin);
    } catch (e) {
      sendJson(res, 400, { error: e.message || 'Invalid request' });
    }
    return;
  }

  // API: DELETE admin (super admin only)
  if (pathname.startsWith('/api/admins/') && req.method === 'DELETE') {
    if (!isSuperAdmin(req)) {
      sendJson(res, 403, { error: 'Super admin only' });
      return;
    }
    const id = pathname.replace(/^\/api\/admins\//, '');
    if (id === 'super') {
      sendJson(res, 400, { error: 'Cannot delete super admin' });
      return;
    }
    try {
      await db.deleteAdmin(id);
      sendJson(res, 200, { success: true });
    } catch (e) {
      sendJson(res, 500, { error: 'Delete failed' });
    }
    return;
  }

  // Route /admin to login page
  if (pathname === '/admin') {
    const filePath = path.join(__dirname, 'public', 'admin.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  }

  // Static files
  const file = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const filePath = path.join(__dirname, 'public', file);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

async function start() {
  await db.init();
  server.listen(PORT, () => {
    console.log(`Puja Display server running at http://localhost:${PORT}`);
    console.log(`TV Display: http://localhost:${PORT}/`);
    console.log(`Admin:      http://localhost:${PORT}/admin`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
