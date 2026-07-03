const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('./config');

const dataDir = path.dirname(path.resolve(config.databasePath));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(config.databasePath, (err) => {
  if (err) console.error('Error opening database:', err);
  else {
    console.log('Connected to SQLite database');
    initializeSchema();
  }
});

const originalRun = db.run.bind(db);
db.run = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    originalRun(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const originalGet = db.get.bind(db);
db.get = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    originalGet(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const originalAll = db.all.bind(db);
db.all = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    originalAll(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

function initializeSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema, (err) => {
    if (err) { console.error('Error initializing schema:', err); return; }
    console.log('Database schema initialized');
    runMigrations();
  });
}

function runMigrations() {
  // Add avatar_url column if it doesn't exist yet
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error:', err.message);
    }
  });
  // Add role column if it doesn't exist yet
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error:', err.message);
    }
  });
}

module.exports = db;
