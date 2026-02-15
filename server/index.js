import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { newId } from './db.js';
import {
  hashPassword, verifyPassword, createToken,
  authMiddleware, adminOnly, seedAdmin,
} from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 6002;

app.use(express.json({ limit: '5mb' }));

// CORS for dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ──────────────── AUTH ────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const roleRow = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').get(user.id);
  const role = roleRow?.role || 'user';
  const token = createToken({ id: user.id, email: user.email, role });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      designation: user.designation,
      phone: user.phone,
      must_change_password: !!user.must_change_password,
      role,
    },
  });
});

app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime("now") WHERE id = ?')
    .run(hashPassword(newPassword), req.user.id);
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, designation, phone, must_change_password FROM users WHERE id = ?').get(req.user.id);
  const roleRow = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').get(req.user.id);
  res.json({ ...user, must_change_password: !!user.must_change_password, role: roleRow?.role || 'user' });
});

// ──────────────── USERS (admin) ────────────────

app.get('/api/users', authMiddleware, adminOnly, (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.designation, u.phone, u.must_change_password,
           COALESCE(r.role, 'user') as role
    FROM users u LEFT JOIN user_roles r ON u.id = r.user_id
    ORDER BY u.full_name
  `).all();
  res.json(users.map(u => ({ ...u, must_change_password: !!u.must_change_password })));
});

app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
  const { email, password, full_name, designation, phone, role } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password, full_name are required' });
  }
  const id = newId();
  try {
    db.prepare(`INSERT INTO users (id, email, password_hash, full_name, designation, phone, must_change_password)
                VALUES (?, ?, ?, ?, ?, ?, 1)`)
      .run(id, email, hashPassword(password), full_name, designation || '', phone || '');
    db.prepare(`INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`)
      .run(newId(), id, role || 'user');
    res.json({ id, email, full_name, designation, phone, role: role || 'user' });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }
});

app.put('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  const { full_name, designation, phone, role, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(`UPDATE users SET full_name = ?, designation = ?, phone = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(full_name || user.full_name, designation ?? user.designation, phone ?? user.phone, req.params.id);

  if (role) {
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(req.params.id);
    db.prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)').run(newId(), req.params.id, role);
  }
  if (password) {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?')
      .run(hashPassword(password), req.params.id);
  }
  res.json({ success: true });
});

app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────── PROJECTS ────────────────

app.get('/api/projects', authMiddleware, (_req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();
  res.json(projects);
});

app.post('/api/projects', authMiddleware, adminOnly, (req, res) => {
  const { name, location, status } = req.body;
  const id = newId();
  db.prepare('INSERT INTO projects (id, name, location, status) VALUES (?, ?, ?, ?)')
    .run(id, name, location, status || 'active');
  res.json({ id, name, location, status: status || 'active' });
});

app.put('/api/projects/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, location, status } = req.body;
  db.prepare(`UPDATE projects SET name = COALESCE(?, name), location = COALESCE(?, location),
              status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?`)
    .run(name, location, status, req.params.id);
  res.json({ success: true });
});

app.delete('/api/projects/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────── MATERIAL CATEGORIES ────────────────

app.get('/api/categories', authMiddleware, (_req, res) => {
  res.json(db.prepare('SELECT * FROM material_categories ORDER BY name').all());
});

app.post('/api/categories', authMiddleware, adminOnly, (req, res) => {
  const { name } = req.body;
  const id = newId();
  const slug = name.toLowerCase().replace(/\s+/g, '_');
  db.prepare('INSERT INTO material_categories (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);
  res.json({ id, name, slug });
});

app.delete('/api/categories/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM material_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────── MATERIAL REQUESTS ────────────────

app.get('/api/requests', authMiddleware, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let requests;
  if (isAdmin) {
    requests = db.prepare('SELECT * FROM material_requests ORDER BY created_at DESC').all();
  } else {
    requests = db.prepare('SELECT * FROM material_requests WHERE requester_id = ? ORDER BY created_at DESC').all(req.user.id);
  }

  const projects = db.prepare('SELECT id, name FROM projects').all();
  const profiles = db.prepare('SELECT id, full_name, designation FROM users').all();
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  const enriched = requests.map(r => {
    const itemCount = db.prepare('SELECT COUNT(*) as c FROM material_request_items WHERE request_id = ?').get(r.id);
    return {
      ...r,
      project_name: projectMap[r.project_id]?.name || 'Unknown',
      requester_name: profileMap[r.requester_id]?.full_name || 'Unknown',
      requester_designation: profileMap[r.requester_id]?.designation || '',
      items_count: itemCount.c,
    };
  });
  res.json(enriched);
});

app.get('/api/requests/:id', authMiddleware, (req, res) => {
  const request = db.prepare('SELECT * FROM material_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const items = db.prepare('SELECT * FROM material_request_items WHERE request_id = ?').all(req.params.id);
  const approvals = db.prepare(`
    SELECT a.*, u.full_name as user_name FROM approvals a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.request_id = ?
    ORDER BY a.created_at
  `).all(req.params.id);
  const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(request.project_id);
  const requester = db.prepare('SELECT full_name, designation, phone FROM users WHERE id = ?').get(request.requester_id);

  res.json({
    ...request,
    project_name: project?.name,
    requester_name: requester?.full_name,
    requester_designation: requester?.designation,
    requester_phone: requester?.phone,
    items,
    approvals,
  });
});

app.post('/api/requests', authMiddleware, (req, res) => {
  const { project_id, priority, required_date, remarks, items, status } = req.body;
  const id = newId();
  const reqNum = `REQ-${Date.now().toString(36).toUpperCase()}`;

  db.prepare(`INSERT INTO material_requests (id, request_number, project_id, request_type, priority, required_date, remarks, requester_id, status)
              VALUES (?, ?, ?, 'stock_request', ?, ?, ?, ?, ?)`)
    .run(id, reqNum, project_id, priority || 'normal', required_date || null, remarks || '', req.user.id, status || 'draft');

  if (Array.isArray(items)) {
    const stmt = db.prepare(`INSERT INTO material_request_items (id, request_id, category, name, specification, quantity, unit, preferred_brand)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of items) {
      stmt.run(newId(), id, item.category, item.name, item.specification || null, item.quantity, item.unit, item.preferred_brand || null);
    }
  }

  res.json({ id, request_number: reqNum });
});

app.patch('/api/requests/:id', authMiddleware, (req, res) => {
  const request = db.prepare('SELECT * FROM material_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { status, request_type, priority, remarks } = req.body;
  db.prepare(`UPDATE material_requests SET
    status = COALESCE(?, status),
    request_type = COALESCE(?, request_type),
    priority = COALESCE(?, priority),
    remarks = COALESCE(?, remarks),
    updated_at = datetime('now')
    WHERE id = ?`)
    .run(status, request_type, priority, remarks, req.params.id);
  res.json({ success: true });
});

app.delete('/api/requests/:id', authMiddleware, (req, res) => {
  const request = db.prepare('SELECT * FROM material_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM material_request_items WHERE request_id = ?').run(req.params.id);
  db.prepare('DELETE FROM material_requests WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ──────────────── APPROVALS ────────────────

app.get('/api/approvals/pending', authMiddleware, adminOnly, (_req, res) => {
  const requests = db.prepare(`SELECT * FROM material_requests WHERE status = 'submitted' ORDER BY created_at DESC`).all();
  const projects = db.prepare('SELECT id, name FROM projects').all();
  const profiles = db.prepare('SELECT id, full_name, designation FROM users').all();
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  res.json(requests.map(r => ({
    ...r,
    project_name: projectMap[r.project_id]?.name || 'Unknown',
    requester_name: profileMap[r.requester_id]?.full_name || 'Unknown',
    requester_designation: profileMap[r.requester_id]?.designation || '',
  })));
});

app.get('/api/approvals/pending/count', authMiddleware, adminOnly, (_req, res) => {
  const row = db.prepare(`SELECT COUNT(*) as c FROM material_requests WHERE status = 'submitted'`).get();
  res.json({ count: row.c });
});

app.post('/api/approvals', authMiddleware, adminOnly, (req, res) => {
  const { request_id, action, comment, request_type } = req.body;
  const id = newId();

  db.prepare('INSERT INTO approvals (id, request_id, user_id, action, comment) VALUES (?, ?, ?, ?, ?)')
    .run(id, request_id, req.user.id, action, comment || null);

  const newStatus = action === 'approved' ? 'approved' : 'pm_rejected';
  db.prepare(`UPDATE material_requests SET status = ?, request_type = COALESCE(?, request_type), updated_at = datetime('now') WHERE id = ?`)
    .run(newStatus, request_type, request_id);

  res.json({ id, success: true });
});

// ──────────────── STOCK ────────────────

app.get('/api/stock', authMiddleware, (_req, res) => {
  const items = db.prepare('SELECT * FROM stock_items ORDER BY created_at DESC').all();
  res.json({ items });
});

app.post('/api/stock', authMiddleware, adminOnly, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });

  const today = new Date().toISOString().slice(0, 10);
  const stmt = db.prepare('INSERT INTO stock_items (id, date, item, description, qty, unit, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(newId(), row.date || today, row.item || '', row.description || '', Number(row.qty) || 0, row.unit || '', req.user.id);
    }
  });
  insertMany(items);

  const all = db.prepare('SELECT * FROM stock_items ORDER BY created_at DESC').all();
  res.json({ items: all });
});

app.post('/api/stock/deduct', authMiddleware, adminOnly, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });

  const today = new Date().toISOString().slice(0, 10);
  const stmt = db.prepare('INSERT INTO stock_items (id, date, item, description, qty, unit, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const deductMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(newId(), row.date || today, row.item || '', row.description || '', -Math.abs(Number(row.qty) || 0), row.unit || '', req.user.id);
    }
  });
  deductMany(items);

  const all = db.prepare('SELECT * FROM stock_items ORDER BY created_at DESC').all();
  res.json({ items: all });
});

// ──────────────── DASHBOARD METRICS ────────────────

app.get('/api/dashboard/metrics', authMiddleware, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let requests;
  if (isAdmin) {
    requests = db.prepare('SELECT status, priority FROM material_requests').all();
  } else {
    requests = db.prepare('SELECT status, priority FROM material_requests WHERE requester_id = ?').all(req.user.id);
  }
  const total = requests.length;
  const pending = requests.filter(r => r.status === 'submitted').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const urgent = requests.filter(r => r.priority === 'urgent').length;
  res.json([
    { label: 'Total Requests', value: total, trend: 'up', change: 0 },
    { label: 'Pending Approval', value: pending, trend: 'neutral' },
    { label: 'Approved', value: approved, trend: 'up', change: 0 },
    { label: 'Urgent', value: urgent, trend: 'down', change: 0 },
  ]);
});

// ──────────────── PROFILES ────────────────

app.get('/api/profiles', authMiddleware, (_req, res) => {
  const profiles = db.prepare('SELECT id, id as user_id, full_name, designation, phone FROM users').all();
  res.json(profiles);
});

// ──────────────── STATIC FILES ────────────────

app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ──────────────── START ────────────────

seedAdmin();
app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Data directory: ${path.resolve(path.join(__dirname, '..', 'data'))}`);
});
