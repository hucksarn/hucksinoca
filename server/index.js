import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 6002;
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const stockFile = process.env.STOCK_FILE || path.join(dataDir, 'stock.json');

app.use(express.json({ limit: '5mb' }));

async function ensureFile(filePath, defaultValue) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function initStorage() {
  await ensureFile(stockFile, []);
}

app.get('/api/stock', async (_req, res) => {
  const stock = await readJson(stockFile, []);
  res.json({ items: stock });
});

app.post('/api/stock', async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }

  const stock = await readJson(stockFile, []);
  const normalized = items.map((item) => ({
    id: createId('stock'),
    date: item.date || todayISO(),
    description: item.description || '',
    qty: Number(item.qty) || 0,
    unit: item.unit || '',
  }));

  const next = [...normalized, ...stock];
  await writeJson(stockFile, next);
  res.json({ items: next });
});


app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

initStorage()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize storage', error);
    process.exit(1);
  });
