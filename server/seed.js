/**
 * Seed script — imports data/seed.json into the local SQLite database.
 * Run once after first setup:  node server/seed.js
 * 
 * WARNING: This will clear existing data and re-insert from seed.json.
 * All users get password "admin123" and must_change_password = true.
 */

import db, { newId } from './db.js';
import { hashPassword } from './auth.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(resolve(__dirname, '..', 'data', 'seed.json'), 'utf-8'));

console.log('🌱 Seeding database...\n');

// ── Users ──
const userMap = {};
for (const u of seed.users) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (existing) {
    userMap[u.email] = existing.id;
    console.log(`  ⏭  User exists: ${u.email}`);
    continue;
  }
  const id = newId();
  db.prepare(`INSERT INTO users (id, email, password_hash, full_name, designation, phone, must_change_password)
              VALUES (?, ?, ?, ?, ?, ?, 1)`)
    .run(id, u.email, hashPassword(u.password), u.full_name, u.designation, u.phone || null);
  db.prepare(`INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`)
    .run(newId(), id, u.role || 'user');
  userMap[u.email] = id;
  console.log(`  ✓ User created: ${u.email} (${u.role})`);
}

// ── Projects ──
for (const p of seed.projects) {
  const existing = db.prepare('SELECT id FROM projects WHERE name = ?').get(p.name);
  if (existing) {
    console.log(`  ⏭  Project exists: ${p.name}`);
    continue;
  }
  db.prepare(`INSERT INTO projects (id, name, location) VALUES (?, ?, ?)`)
    .run(newId(), p.name, p.location);
  console.log(`  ✓ Project created: ${p.name}`);
}

// ── Categories ──
for (const name of seed.categories) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (existing) {
    console.log(`  ⏭  Category exists: ${name}`);
    continue;
  }
  db.prepare(`INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)`)
    .run(newId(), name, slug);
  console.log(`  ✓ Category created: ${name}`);
}

// ── Stock items ──
const adminId = userMap['admin@system.local'] || Object.values(userMap)[0];
for (const s of seed.stock_items) {
  db.prepare(`INSERT INTO stock_items (id, date, item, description, qty, unit, category, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId(), s.date, s.item, s.description, s.qty, s.unit, s.category || null, adminId);
  console.log(`  ✓ Stock: ${s.item} x${s.qty}`);
}

console.log('\n✅ Seed complete!');
