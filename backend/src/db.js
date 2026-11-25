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
  else console.log('Connected to SQLite database');
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

function exec(sql) {
  return new Promise((resolve, reject) => db.exec(sql, (err) => (err ? reject(err) : resolve())));
}

async function addColumn(sql) {
  try {
    await exec(sql);
  } catch (err) {
    if (!err.message.includes('duplicate column')) throw err;
  }
}

async function initializeSchema() {
  // v1: replace the daily-challenge model with daily logs + boss events.
  // Old data is wiped on purpose (everyone starts from 0 XP).
  const { user_version: version } = await db.get('PRAGMA user_version');
  if (version < 1) {
    await exec(`
      DROP TABLE IF EXISTS results;
      DROP TABLE IF EXISTS daily_challenges;
      DROP TABLE IF EXISTS user_stats;
    `);
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await exec(schema);

  await addColumn('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  await addColumn("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  // Existing users are auto-approved
  await addColumn("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'");

  // Admin HP edits: a fixed max HP (NULL = formula) and an offset added to the hit count.
  await addColumn('ALTER TABLE events ADD COLUMN custom_max_hp INTEGER');
  await addColumn('ALTER TABLE events ADD COLUMN damage_adjust INTEGER NOT NULL DEFAULT 0');

  if (version < 1) await exec('PRAGMA user_version = 1');
  console.log('Database schema initialized');
}

// Resolves once the schema and migrations have been applied.
db.ready = new Promise((resolve, reject) => {
  db.once('open', () => initializeSchema().then(resolve, (err) => {
    console.error('Error initializing schema:', err);
    reject(err);
  }));
});

module.exports = db;
