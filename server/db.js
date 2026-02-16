import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store data in ./data relative to project root (user-level, no sudo needed)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'app.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    must_change_password INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, role)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS material_categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS material_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_number TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id),
    request_type TEXT NOT NULL DEFAULT 'stock_request',
    priority TEXT NOT NULL DEFAULT 'normal',
    required_date TEXT,
    remarks TEXT,
    requester_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS material_request_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_id TEXT NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    specification TEXT,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    preferred_brand TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_id TEXT NOT NULL REFERENCES material_requests(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data TEXT,
    new_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    date TEXT DEFAULT '',
    item TEXT DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    qty REAL NOT NULL DEFAULT 0,
    unit TEXT DEFAULT '',
    category TEXT DEFAULT '',
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Lightweight migration: ensure stock_items has category column.
const stockColumns = db.prepare(`PRAGMA table_info(stock_items)`).all().map((col) => col.name);
if (!stockColumns.includes('category')) {
  db.exec(`ALTER TABLE stock_items ADD COLUMN category TEXT DEFAULT ''`);
}

// Helper: generate UUID-like id
export function newId() {
  return crypto.randomUUID();
}

export default db;
