const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'calculator.db');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'calculator.html'));
});

let db;

async function loadDb() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      expression TEXT NOT NULL,
      result     TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  persist();
}

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

app.get('/api/history', (req, res) => {
  const stmt = db.prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT 100');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  res.json(rows);
});

app.post('/api/history', (req, res) => {
  const { expression, result } = req.body;
  if (!expression || result === undefined) {
    return res.status(400).json({ error: 'expression and result are required' });
  }
  db.run('INSERT INTO history (expression, result) VALUES (?, ?)', [expression, result]);
  persist();
  const stmt = db.prepare('SELECT last_insert_rowid() AS id');
  stmt.step();
  const { id } = stmt.getAsObject();
  stmt.free();
  res.json({ id });
});

app.delete('/api/history', (req, res) => {
  db.run('DELETE FROM history');
  persist();
  res.json({ ok: true });
});

const PORT = 3000;
loadDb().then(() => {
  app.listen(PORT, () => console.log(`Calculator running at http://localhost:${PORT}`));
});
