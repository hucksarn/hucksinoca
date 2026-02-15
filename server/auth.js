import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db, { newId } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-' + Math.random().toString(36);
const JWT_EXPIRES = '7d';

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Express middleware: attach req.user
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    // Refresh role from DB
    const roleRow = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').get(payload.id);
    req.user = { ...payload, role: roleRow?.role || 'user' };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Express middleware: require admin role
export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Seed default admin if no users exist
export function seedAdmin() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    const id = newId();
    const hash = hashPassword('admin123');
    db.prepare(`INSERT INTO users (id, email, password_hash, full_name, designation, must_change_password)
                VALUES (?, ?, ?, ?, ?, 1)`).run(id, 'admin@company.com', hash, 'System Admin', 'Administrator');
    db.prepare(`INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`).run(newId(), id);
    console.log('✓ Default admin created: admin@company.com / admin123');
  }
}
