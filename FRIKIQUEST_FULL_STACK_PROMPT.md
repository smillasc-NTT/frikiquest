# PROMPT COMPLETO: CONSTRUIR FRIKIQUEST (BACKEND + FRONTEND REACT)

Eres un full-stack developer experto. Tu tarea es construir **FrikiQuest completo** (backend Express + frontend React) usando Superpowers en Claude Code.

El proyecto está en `/frikiquest` y necesita **dos carpetas**:
- `backend/` → Node.js + Express + SQLite
- `frontend/` → React + Vite

---

## PARTE 1: BACKEND (Express + SQLite)

### Estructura Backend
```
frikiquest/
└── backend/
    ├── src/
    │   ├── index.js
    │   ├── config.js
    │   ├── db.js
    │   ├── schema.sql
    │   ├── middleware/
    │   │   ├── auth.js
    │   │   └── errorHandler.js
    │   ├── controllers/
    │   │   ├── authController.js
    │   │   ├── challengeController.js
    │   │   ├── resultController.js
    │   │   ├── leaderboardController.js
    │   │   └── userController.js
    │   ├── routes/
    │   │   ├── auth.js
    │   │   ├── challenges.js
    │   │   ├── results.js
    │   │   ├── leaderboard.js
    │   │   └── users.js
    │   ├── utils/
    │   │   ├── validators.js
    │   │   └── helpers.js
    ├── data/
    │   └── frikiquest.db (generada)
    ├── .env
    ├── .env.example
    ├── package.json
    └── seed.js
```

### Backend: package.json
```json
{
  "name": "frikiquest-backend",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node src/index.js",
    "seed": "node seed.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  }
}
```

### Backend: .env
```
NODE_ENV=development
PORT=3000
JWT_SECRET=frikiquest_secret_dev_12345678901234567890
JWT_EXPIRY=7d
CORS_ORIGIN=*
DATABASE_PATH=./data/frikiquest.db
```

### Backend: .env.example
```
NODE_ENV=development
PORT=3000
JWT_SECRET=tu_secret_muy_largo_minimo_32_chars
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
DATABASE_PATH=./data/frikiquest.db
```

### Backend: src/config.js
```javascript
require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databasePath: process.env.DATABASE_PATH || './data/frikiquest.db',
  minPasswordLength: 8,
  maxNameLength: 100,
  maxTextResultLength: 500,
  maxNumericValue: 10000,
};
```

### Backend: src/schema.sql
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id TEXT PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('numeric', 'boolean', 'text')),
  min_value INTEGER,
  max_value INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  value TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id),
  UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  total_score INTEGER DEFAULT 0,
  results_count INTEGER DEFAULT 0,
  last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_date ON daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_challenge ON results(challenge_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(submitted_at);
```

### Backend: src/db.js
```javascript
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('./config');

const dataDir = path.dirname(config.databasePath);
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
    if (err) console.error('Error initializing schema:', err);
    else console.log('Database schema initialized');
  });
}

module.exports = db;
```

### Backend: src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing', code: 'MISSING_TOKEN' });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
```

### Backend: src/middleware/errorHandler.js
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', new Date().toISOString(), err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';
  
  res.status(statusCode).json({
    error: message,
    code: code,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
};

module.exports = { errorHandler };
```

### Backend: src/utils/validators.js
```javascript
const config = require('../config');

const validators = {
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidPassword: (password) => password && password.length >= config.minPasswordLength,
  isValidName: (name) => name && name.trim().length > 0 && name.length <= config.maxNameLength,
  isValidResultValue: (value, type, minVal, maxVal) => {
    if (type === 'numeric') {
      const num = parseInt(value);
      if (isNaN(num) || num <= 0 || num > config.maxNumericValue) return false;
      if (minVal !== null && num < minVal) return false;
      if (maxVal !== null && num > maxVal) return false;
      return true;
    }
    if (type === 'boolean') {
      return value === 'true' || value === 'false' || value === true || value === false;
    }
    if (type === 'text') {
      return value && typeof value === 'string' && value.length > 0 && value.length <= config.maxTextResultLength;
    }
    return false;
  },
};

module.exports = validators;
```

### Backend: src/utils/helpers.js
```javascript
const crypto = require('crypto');

const helpers = {
  generateId: () => crypto.randomBytes(16).toString('hex').toLowerCase(),
  calculateScore: (value, type, minValue = null) => {
    if (type === 'numeric' && minValue) {
      const ratio = parseInt(value) / minValue;
      return Math.min(Math.floor(ratio * 100), 100);
    }
    if (type === 'boolean') return value === 'true' || value === true ? 100 : 0;
    if (type === 'text') return 100;
    return 100;
  },
  getTodayDate: () => new Date().toISOString().split('T')[0],
  getYesterdayDate: () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  },
};

module.exports = helpers;
```

### Backend: src/controllers/authController.js
```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const validators = require('../utils/validators');
const helpers = require('../utils/helpers');

const authController = {
  signup: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      if (!validators.isValidName(name)) return res.status(400).json({ error: 'Invalid name', code: 'VALIDATION_ERROR' });
      if (!validators.isValidEmail(email)) return res.status(400).json({ error: 'Invalid email', code: 'VALIDATION_ERROR' });
      if (!validators.isValidPassword(password)) return res.status(400).json({ error: 'Password too short', code: 'VALIDATION_ERROR' });
      
      const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) return res.status(400).json({ error: 'Email already exists', code: 'EMAIL_EXISTS' });
      
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = helpers.generateId();
      
      await db.run('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [userId, name, email, passwordHash]);
      await db.run('INSERT INTO user_stats (user_id, total_score, results_count) VALUES (?, 0, 0)', [userId]);
      
      const token = jwt.sign({ sub: userId, name, email }, config.jwtSecret, { expiresIn: config.jwtExpiry });
      res.status(201).json({ user: { id: userId, name, email, createdAt: new Date().toISOString() }, token });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Missing fields', code: 'VALIDATION_ERROR' });
      
      const user = await db.get('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]);
      if (!user) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      
      const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiry });
      res.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at }, token });
    } catch (err) {
      next(err);
    }
  },

  getMe: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const user = await db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      
      const stats = await db.get('SELECT total_score FROM user_stats WHERE user_id = ?', [userId]);
      res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.created_at, totalScore: stats?.total_score || 0 });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
```

### Backend: src/controllers/challengeController.js
```javascript
const db = require('../db');
const helpers = require('../utils/helpers');

const challengeController = {
  getTodayChallenge: async (req, res, next) => {
    try {
      const today = helpers.getTodayDate();
      const userId = req.user.sub;
      const challenge = await db.get('SELECT * FROM daily_challenges WHERE date = ?', [today]);
      if (!challenge) return res.status(404).json({ error: 'No challenge for today', code: 'NOT_FOUND' });
      
      const result = await db.get('SELECT id FROM results WHERE user_id = ? AND challenge_id = ?', [userId, challenge.id]);
      res.json({ id: challenge.id, date: challenge.date, title: challenge.title, description: challenge.description, criteria: challenge.criteria, type: challenge.type, minValue: challenge.min_value, maxValue: challenge.max_value, userHasSubmitted: !!result });
    } catch (err) {
      next(err);
    }
  },

  createChallenge: async (req, res, next) => {
    try {
      const { date, title, description, criteria, type, minValue, maxValue } = req.body;
      if (!date || !title || !description || !criteria || !type) return res.status(400).json({ error: 'Missing fields', code: 'VALIDATION_ERROR' });
      if (!['numeric', 'boolean', 'text'].includes(type)) return res.status(400).json({ error: 'Invalid type', code: 'VALIDATION_ERROR' });
      
      const existing = await db.get('SELECT id FROM daily_challenges WHERE date = ?', [date]);
      if (existing) return res.status(400).json({ error: 'Challenge exists for this date', code: 'VALIDATION_ERROR' });
      
      const challengeId = helpers.generateId();
      await db.run(`INSERT INTO daily_challenges (id, date, title, description, criteria, type, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [challengeId, date, title, description, criteria, type, minValue || null, maxValue || null]);
      
      res.status(201).json({ id: challengeId, date, title, description, criteria, type, minValue, maxValue });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = challengeController;
```

### Backend: src/controllers/resultController.js
```javascript
const db = require('../db');
const validators = require('../utils/validators');
const helpers = require('../utils/helpers');

const resultController = {
  submitResult: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const { challengeId, value } = req.body;
      if (!challengeId || value === undefined) return res.status(400).json({ error: 'Missing fields', code: 'VALIDATION_ERROR' });
      
      const challenge = await db.get('SELECT * FROM daily_challenges WHERE id = ?', [challengeId]);
      if (!challenge) return res.status(404).json({ error: 'Challenge not found', code: 'NOT_FOUND' });
      
      if (!validators.isValidResultValue(value, challenge.type, challenge.min_value, challenge.max_value)) {
        return res.status(400).json({ error: 'Invalid value', code: 'VALIDATION_ERROR' });
      }
      
      const existing = await db.get('SELECT id FROM results WHERE user_id = ? AND challenge_id = ?', [userId, challengeId]);
      if (existing) return res.status(409).json({ error: 'Already submitted', code: 'DUPLICATE_RESULT' });
      
      const score = helpers.calculateScore(value, challenge.type, challenge.min_value);
      const resultId = helpers.generateId();
      
      await db.run(`INSERT INTO results (id, user_id, challenge_id, value, score) VALUES (?, ?, ?, ?, ?)`, [resultId, userId, challengeId, String(value), score]);
      await db.run(`UPDATE user_stats SET total_score = total_score + ?, results_count = results_count + 1, last_update = CURRENT_TIMESTAMP WHERE user_id = ?`, [score, userId]);
      
      res.status(201).json({ id: resultId, userId, challengeId, value, score, submittedAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },

  getMyResultToday: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const today = helpers.getTodayDate();
      const result = await db.get(`SELECT r.* FROM results r JOIN daily_challenges c ON r.challenge_id = c.id WHERE r.user_id = ? AND c.date = ?`, [userId, today]);
      if (!result) return res.status(404).json({ error: 'No result found', code: 'NOT_FOUND' });
      
      res.json({ id: result.id, challengeId: result.challenge_id, value: result.value, score: result.score, submittedAt: result.submitted_at });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = resultController;
```

### Backend: src/controllers/leaderboardController.js
```javascript
const db = require('../db');
const helpers = require('../utils/helpers');

const leaderboardController = {
  getDailyLeaderboard: async (req, res, next) => {
    try {
      const today = helpers.getTodayDate();
      const yesterday = helpers.getYesterdayDate();
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const todayRankings = await db.all(
        `SELECT u.id, u.name, COALESCE(SUM(r.score), 0) as score FROM users u LEFT JOIN results r ON u.id = r.user_id LEFT JOIN daily_challenges c ON r.challenge_id = c.id AND c.date = ? GROUP BY u.id ORDER BY score DESC LIMIT ? OFFSET ?`,
        [today, limit, offset]
      );

      const yesterdayRankings = await db.all(
        `SELECT u.id, u.name, COALESCE(SUM(r.score), 0) as score FROM users u LEFT JOIN results r ON u.id = r.user_id LEFT JOIN daily_challenges c ON r.challenge_id = c.id AND c.date = ? GROUP BY u.id ORDER BY score DESC`,
        [yesterday]
      );

      const yesterdayMap = {};
      yesterdayRankings.forEach((entry, idx) => { yesterdayMap[entry.id] = idx + 1; });

      const entries = todayRankings.map((entry, idx) => {
        const prevRank = yesterdayMap[entry.id];
        let change = null;
        if (prevRank) change = prevRank - (idx + 1);
        return { rank: offset + idx + 1, userId: entry.id, userName: entry.name, score: entry.score || 0, changeFromYesterday: change };
      });

      res.json({ date: today, entries });
    } catch (err) {
      next(err);
    }
  },

  getMonthlyLeaderboard: async (req, res, next) => {
    try {
      const now = new Date();
      const year = parseInt(req.query.year) || now.getFullYear();
      const month = parseInt(req.query.month) || now.getMonth() + 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const monthStart = `${monthStr}-01`;
      const monthEnd = `${monthStr}-31`;

      const rankings = await db.all(
        `SELECT u.id, u.name, COALESCE(SUM(r.score), 0) as total_score, COUNT(r.id) as results_count FROM users u LEFT JOIN results r ON u.id = r.user_id LEFT JOIN daily_challenges c ON r.challenge_id = c.id AND c.date BETWEEN ? AND ? GROUP BY u.id ORDER BY total_score DESC LIMIT ? OFFSET ?`,
        [monthStart, monthEnd, limit, offset]
      );

      const entries = rankings.map((entry, idx) => ({
        rank: offset + idx + 1,
        userId: entry.id,
        userName: entry.name,
        score: entry.total_score || 0,
        resultsCount: entry.results_count || 0
      }));

      res.json({ period: monthStr, entries });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = leaderboardController;
```

### Backend: src/controllers/userController.js
```javascript
const bcrypt = require('bcryptjs');
const db = require('../db');
const validators = require('../utils/validators');

const userController = {
  getUserStats: async (req, res, next) => {
    try {
      const userId = req.params.id;
      const user = await db.get('SELECT id, name FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      
      const stats = await db.get('SELECT total_score, results_count FROM user_stats WHERE user_id = ?', [userId]);
      res.json({ userId: user.id, name: user.name, totalScore: stats?.total_score || 0, resultsCount: stats?.results_count || 0 });
    } catch (err) {
      next(err);
    }
  },

  updatePassword: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields', code: 'VALIDATION_ERROR' });
      if (!validators.isValidPassword(newPassword)) return res.status(400).json({ error: 'Password too short', code: 'VALIDATION_ERROR' });
      
      const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Incorrect password', code: 'INVALID_PASSWORD' });
      
      const newHash = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, userId]);
      
      res.json({ message: 'Password updated' });
    } catch (err) {
      next(err);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      
      await db.run('DELETE FROM results WHERE user_id = ?', [userId]);
      await db.run('DELETE FROM user_stats WHERE user_id = ?', [userId]);
      await db.run('DELETE FROM users WHERE id = ?', [userId]);
      
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = userController;
```

### Backend: src/routes/auth.js
```javascript
const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
```

### Backend: src/routes/challenges.js
```javascript
const express = require('express');
const challengeController = require('../controllers/challengeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/today', authenticateToken, challengeController.getTodayChallenge);
router.post('/', challengeController.createChallenge);

module.exports = router;
```

### Backend: src/routes/results.js
```javascript
const express = require('express');
const resultController = require('../controllers/resultController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.post('/', authenticateToken, resultController.submitResult);
router.get('/my-today', authenticateToken, resultController.getMyResultToday);

module.exports = router;
```

### Backend: src/routes/leaderboard.js
```javascript
const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/daily', authenticateToken, leaderboardController.getDailyLeaderboard);
router.get('/monthly', authenticateToken, leaderboardController.getMonthlyLeaderboard);

module.exports = router;
```

### Backend: src/routes/users.js
```javascript
const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/:id/stats', authenticateToken, userController.getUserStats);
router.put('/:id/password', authenticateToken, userController.updatePassword);
router.delete('/:id', authenticateToken, userController.deleteUser);

module.exports = router;
```

### Backend: src/index.js
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const db = require('./db');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const resultRoutes = require('./routes/results');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', code: 'NOT_FOUND' });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[${new Date().toISOString()}] FrikiQuest API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close((err) => {
    if (err) console.error(err);
    process.exit(0);
  });
});
```

### Backend: seed.js
```javascript
const db = require('./src/db');
const bcrypt = require('bcryptjs');
const { generateId, getTodayDate } = require('./src/utils/helpers');

async function seed() {
  try {
    console.log('Seeding database...');
    const users = [];
    
    for (let i = 1; i <= 5; i++) {
      const userId = generateId();
      const passwordHash = await bcrypt.hash('password123', 10);
      await db.run('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [userId, `Superfriki ${i}`, `user${i}@test.com`, passwordHash]);
      await db.run('INSERT INTO user_stats (user_id, total_score, results_count) VALUES (?, ?, ?)', [userId, Math.floor(Math.random() * 1000), Math.floor(Math.random() * 20)]);
      users.push(userId);
      console.log(`✓ Created user: Superfriki ${i}`);
    }
    
    const challengeId = generateId();
    const today = getTodayDate();
    await db.run(`INSERT INTO daily_challenges (id, date, title, description, criteria, type, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [challengeId, today, '50 Flexiones', 'Completa 50 flexiones', 'Mínimo: 50', 'numeric', 50, 500]);
    console.log('✓ Created daily challenge');
    
    for (let i = 0; i < users.length; i++) {
      const resultId = generateId();
      const value = 50 + Math.floor(Math.random() * 100);
      const score = Math.min(100, Math.floor((value / 50) * 100));
      await db.run(`INSERT INTO results (id, user_id, challenge_id, value, score) VALUES (?, ?, ?, ?, ?)`, [resultId, users[i], challengeId, String(value), score]);
      await db.run(`UPDATE user_stats SET total_score = total_score + ?, results_count = results_count + 1 WHERE user_id = ?`, [score, users[i]]);
    }
    console.log('✓ Created results');
    console.log('\n✓ Seed completed');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seed();
```

---

## PARTE 2: FRONTEND (React + Vite)

### Estructura Frontend
```
frikiquest/
└── frontend/
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── SignUp.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Profile.jsx
    │   │   └── NotFound.jsx
    │   ├── components/
    │   │   ├── Header.jsx
    │   │   ├── Navigation.jsx
    │   │   ├── Card.jsx
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Modal.jsx
    │   │   ├── Toast.jsx
    │   │   ├── Leaderboard.jsx
    │   │   ├── ChallengeCard.jsx
    │   │   ├── UserStatsCard.jsx
    │   │   └── PasswordChangeModal.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── AppContext.jsx
    │   ├── hooks/
    │   │   ├── useAuth.js
    │   │   └── useLocalStorage.js
    │   ├── services/
    │   │   ├── api.js
    │   │   ├── authService.js
    │   │   ├── challengeService.js
    │   │   ├── resultService.js
    │   │   ├── leaderboardService.js
    │   │   └── userService.js
    │   ├── styles/
    │   │   ├── colors.css
    │   │   ├── components.css
    │   │   └── responsive.css
    │   ├── utils/
    │   │   ├── validators.js
    │   │   └── constants.js
    │   └── assets/
    ├── public/
    ├── package.json
    ├── vite.config.js
    ├── .env
    └── .env.example
```

### Frontend: package.json
```json
{
  "name": "frikiquest-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

### Frontend: .env
```
VITE_API_URL=http://localhost:3000
```

### Frontend: .env.example
```
VITE_API_URL=http://localhost:3000
```

### Frontend: vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  }
})
```

### Frontend: public/index.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <title>FrikiQuest</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### Frontend: src/main.jsx
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Frontend: src/index.css
```css
:root {
  --color-primary: #FFC107;
  --color-primary-light: #FFD54F;
  --color-bg-main: #1F1F1F;
  --color-bg-secondary: #2A2A2A;
  --color-bg-tertiary: #333333;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #B0B0B0;
  --color-text-muted: #808080;
  --color-success: #4CAF50;
  --color-error: #F44336;
  --color-warning: #FF9800;
  --color-rank-1: #FFD700;
  --color-rank-2: #C0C0C0;
  --color-rank-3: #CD7F32;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; color: var(--color-text-primary); background-color: var(--color-bg-main); }
h1, h2, h3 { font-family: 'JetBrains Mono', monospace; font-weight: 700; }
h1 { font-size: 32px; }
h2 { font-size: 24px; }
h3 { font-size: 20px; }
button { cursor: pointer; border: none; font-family: inherit; }
input, textarea, select { font-family: inherit; }
a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }
```

### Frontend: src/App.jsx
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import Toast from './components/Toast'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toast />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

### Frontend: src/context/AuthContext.jsx
```javascript
import { createContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async () => {
    try {
      const data = await authService.getMe()
      setUser(data)
    } catch (err) {
      setToken(null)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const data = await authService.login(email, password)
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    return data
  }

  const signup = async (name, email, password) => {
    const data = await authService.signup(name, email, password)
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    return data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Frontend: src/context/AppContext.jsx
```javascript
import { createContext, useState } from 'react'

export const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }

  return (
    <AppContext.Provider value={{ showToast, toasts }}>
      {children}
    </AppContext.Provider>
  )
}
```

### Frontend: src/hooks/useAuth.js
```javascript
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### Frontend: src/hooks/useLocalStorage.js
```javascript
import { useState } from 'react'

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue]
}
```

### Frontend: src/services/api.js
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API error')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}
```

### Frontend: src/services/authService.js
```javascript
import { apiCall } from './api'

export const authService = {
  signup: (name, email, password) =>
    apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),

  login: (email, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getMe: () => apiCall('/api/auth/me')
}
```

### Frontend: src/services/challengeService.js
```javascript
import { apiCall } from './api'

export const challengeService = {
  getTodayChallenge: () => apiCall('/api/challenges/today')
}
```

### Frontend: src/services/resultService.js
```javascript
import { apiCall } from './api'

export const resultService = {
  submitResult: (challengeId, value) =>
    apiCall('/api/results', {
      method: 'POST',
      body: JSON.stringify({ challengeId, value })
    }),

  getMyResultToday: () => apiCall('/api/results/my-today')
}
```

### Frontend: src/services/leaderboardService.js
```javascript
import { apiCall } from './api'

export const leaderboardService = {
  getDailyLeaderboard: (limit = 10, offset = 0) =>
    apiCall(`/api/leaderboard/daily?limit=${limit}&offset=${offset}`),

  getMonthlyLeaderboard: (limit = 10, offset = 0, year = null, month = null) => {
    const query = new URLSearchParams({ limit, offset })
    if (year) query.append('year', year)
    if (month) query.append('month', month)
    return apiCall(`/api/leaderboard/monthly?${query}`)
  }
}
```

### Frontend: src/services/userService.js
```javascript
import { apiCall } from './api'

export const userService = {
  getUserStats: (userId) => apiCall(`/api/users/${userId}/stats`),
  
  updatePassword: (userId, currentPassword, newPassword) =>
    apiCall(`/api/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  deleteUser: (userId) =>
    apiCall(`/api/users/${userId}`, {
      method: 'DELETE'
    })
}
```

### Frontend: src/utils/validators.js
```javascript
export const validators = {
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidPassword: (password) => password && password.length >= 8,
  isValidName: (name) => name && name.trim().length > 0 && name.length <= 100,
  passwordsMatch: (pwd1, pwd2) => pwd1 === pwd2,
  isValidNumeric: (value, min, max) => {
    const num = parseInt(value)
    return !isNaN(num) && num > 0 && (!min || num >= min) && (!max || num <= max)
  }
}
```

### Frontend: src/utils/constants.js
```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const POLLING_INTERVAL = 5000
export const TOAST_DURATION = 3000
```

### Frontend: src/components/Header.jsx
```javascript
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Header.css'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/dashboard" className="logo">FrikiQuest</Link>
        {user && <span className="greeting">¡Hola, {user.name}!</span>}
        <nav className="nav-primary">
          <Link to="/dashboard">Home</Link>
          <Link to="/profile">Perfil</Link>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </nav>
      </div>
    </header>
  )
}
```

### Frontend: src/components/Button.jsx
```javascript
export default function Button({ variant = 'primary', size = 'medium', disabled = false, loading = false, onClick, children, className = '' }) {
  const baseClass = `btn btn-${variant} btn-${size}`
  return (
    <button
      className={`${baseClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? '...' : children}
    </button>
  )
}
```

### Frontend: src/components/Input.jsx
```javascript
export default function Input({ type = 'text', label, placeholder, value, onChange, error, required = false, maxLength = null, className = '' }) {
  return (
    <div className="input-group">
      {label && <label>{label} {required && '*'}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={`input ${error ? 'input-error' : ''} ${className}`}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  )
}
```

### Frontend: src/components/Card.jsx
```javascript
export default function Card({ highlighted = false, children, className = '' }) {
  const cardClass = `card ${highlighted ? 'card-highlighted' : ''} ${className}`
  return <div className={cardClass}>{children}</div>
}
```

### Frontend: src/components/Modal.jsx
```javascript
export default function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
```

### Frontend: src/components/Toast.jsx
```javascript
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
import './Toast.css'

export default function Toast() {
  const { toasts } = useContext(AppContext)

  return (
    <div className="toasts-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
```

### Frontend: src/components/ProtectedRoute.jsx
```javascript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
  if (!user) return <Navigate to="/login" />

  return children
}
```

### Frontend: src/pages/Login.jsx
```javascript
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
import Input from '../components/Input'
import Button from '../components/Button'
import { validators } from '../utils/validators'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()

  const validate = () => {
    const newErrors = {}
    if (!validators.isValidEmail(email)) newErrors.email = 'Email inválido'
    if (!validators.isValidPassword(password)) newErrors.password = 'Mínimo 8 caracteres'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      showToast('¡Bienvenido!', 'success')
      navigate('/dashboard')
    } catch (err) {
      showToast('Credenciales inválidas', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>FrikiQuest</h1>
        <h2>Accede a tu cuenta</h2>
        
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Button variant="primary" disabled={loading} loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="auth-link">
          ¿No tienes cuenta? <Link to="/signup">Crear una</Link>
        </p>
      </div>
    </div>
  )
}
```

### Frontend: src/pages/SignUp.jsx
```javascript
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
import Input from '../components/Input'
import Button from '../components/Button'
import { validators } from '../utils/validators'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()

  const validate = () => {
    const newErrors = {}
    if (!validators.isValidName(name)) newErrors.name = 'Nombre inválido'
    if (!validators.isValidEmail(email)) newErrors.email = 'Email inválido'
    if (!validators.isValidPassword(password)) newErrors.password = 'Mínimo 8 caracteres'
    if (!validators.passwordsMatch(password, confirmPassword)) newErrors.confirmPassword = 'Las contraseñas no coinciden'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await signup(name, email, password)
      showToast('¡Cuenta creada!', 'success')
      navigate('/dashboard')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>FrikiQuest</h1>
        <h2>Crea tu cuenta</h2>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Nombre"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <Input
            type="email"
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Input
            type="password"
            label="Confirmar Contraseña"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
          <Button variant="primary" disabled={loading} loading={loading}>
            Crear Cuenta
          </Button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login">Accede aquí</Link>
        </p>
      </div>
    </div>
  )
}
```

### Frontend: src/pages/Dashboard.jsx
```javascript
import { useState, useEffect, useContext } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { challengeService } from '../services/challengeService'
import { resultService } from '../services/resultService'
import { leaderboardService } from '../services/leaderboardService'

export default function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useContext(AppContext)
  const [challenge, setChallenge] = useState(null)
  const [leaderboardDaily, setLeaderboardDaily] = useState([])
  const [leaderboardMonthly, setLeaderboardMonthly] = useState([])
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportValue, setReportValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('daily')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [ch, lb_daily, lb_monthly] = await Promise.all([
        challengeService.getTodayChallenge(),
        leaderboardService.getDailyLeaderboard(),
        leaderboardService.getMonthlyLeaderboard()
      ])
      setChallenge(ch)
      setLeaderboardDaily(lb_daily.entries)
      setLeaderboardMonthly(lb_monthly.entries)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleReportResult = async () => {
    if (!reportValue) {
      showToast('Ingresa un valor', 'error')
      return
    }

    try {
      await resultService.submitResult(challenge.id, reportValue)
      showToast('¡Resultado registrado!', 'success')
      setShowReportModal(false)
      setReportValue('')
      loadData()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (loading) return <div style={{ padding: '40px' }}>Cargando...</div>

  return (
    <>
      <Header />
      <div className="dashboard-container">
        <Card className="user-stats">
          <h3>Tus Stats</h3>
          <p>Score: <strong>{user?.totalScore || 0}</strong></p>
        </Card>

        {challenge && (
          <Card highlighted={true} className="challenge-card">
            <h2>{challenge.title}</h2>
            <p>{challenge.description}</p>
            <p className="criteria">{challenge.criteria}</p>
            {challenge.userHasSubmitted ? (
              <div className="badge badge-success">✓ Completado hoy</div>
            ) : (
              <Button variant="primary" onClick={() => setShowReportModal(true)}>
                Reportar Resultado
              </Button>
            )}
          </Card>
        )}

        <div className="leaderboard-tabs">
          <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>Hoy</button>
          <button className={tab === 'monthly' ? 'active' : ''} onClick={() => setTab('monthly')}>General</button>
        </div>

        <div className="leaderboard">
          {(tab === 'daily' ? leaderboardDaily : leaderboardMonthly).map((entry) => (
            <div key={entry.userId} className="leaderboard-row">
              <span className="rank">#{entry.rank}</span>
              <span className="name">{entry.userName}</span>
              <span className="score">{entry.score}</span>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title={`Reto: ${challenge?.title}`}>
        <Input
          type={challenge?.type === 'numeric' ? 'number' : 'text'}
          label="Tu resultado"
          value={reportValue}
          onChange={(e) => setReportValue(e.target.value)}
        />
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Button variant="primary" onClick={handleReportResult}>Enviar</Button>
          <Button variant="secondary" onClick={() => setShowReportModal(false)}>Cancelar</Button>
        </div>
      </Modal>
    </>
  )
}
```

### Frontend: src/pages/Profile.jsx
```javascript
import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppContext } from '../context/AppContext'
import Header from '../components/Header'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { userService } from '../services/userService'
import { validators } from '../utils/validators'

export default function Profile() {
  const { user, logout } = useAuth()
  const { showToast } = useContext(AppContext)
  const navigate = useNavigate()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChangePassword = async () => {
    if (!validators.isValidPassword(newPassword) || !validators.passwordsMatch(newPassword, confirmPassword)) {
      showToast('Credenciales inválidas', 'error')
      return
    }

    setLoading(true)
    try {
      await userService.updatePassword(user.id, currentPassword, newPassword)
      showToast('Contraseña cambiada', 'success')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    setLoading(true)
    try {
      await userService.deleteUser(user.id)
      showToast('Cuenta eliminada', 'success')
      logout()
      navigate('/login')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="profile-container">
        <Card>
          <h2>Mi Perfil</h2>
          <p><strong>Nombre:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Score:</strong> {user?.totalScore}</p>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
            Cambiar Contraseña
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            Eliminar Cuenta
          </Button>
        </div>
      </div>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambiar Contraseña">
        <Input type="password" label="Contraseña Actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <Input type="password" label="Nueva Contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Input type="password" label="Confirmar Contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Button variant="primary" loading={loading} onClick={handleChangePassword}>Cambiar</Button>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancelar</Button>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar Cuenta">
        <p>¿Estás seguro? Esta acción no se puede deshacer.</p>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Button variant="danger" loading={loading} onClick={handleDeleteUser}>Sí, Eliminar</Button>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
        </div>
      </Modal>
    </>
  )
}
```

### Frontend: src/pages/NotFound.jsx
```javascript
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>404 - Página no encontrada</h1>
      <Link to="/dashboard">Volver al inicio</Link>
    </div>
  )
}
```

### Frontend: src/styles/Header.css
```css
.header {
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid #444;
  padding: 20px 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
}

.greeting {
  flex: 1;
  text-align: center;
  color: var(--color-text-secondary);
}

.nav-primary {
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-primary a {
  color: var(--color-text-secondary);
}

.nav-primary a:hover {
  color: var(--color-primary);
}

.btn-logout {
  background: transparent;
  color: var(--color-error);
  cursor: pointer;
  border: none;
}
```

### Frontend: src/styles/components.css
```css
.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-bg-main);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-light);
  transform: scale(1.05);
}

.btn-secondary {
  background-color: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-primary);
  color: var(--color-bg-main);
}

.btn-danger {
  background-color: var(--color-error);
  color: var(--color-text-primary);
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #444;
  border-radius: 8px;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: inherit;
  transition: all 0.3s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.2);
}

.input-error {
  border-color: var(--color-error);
}

.input-error-message {
  color: var(--color-error);
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.card {
  background-color: var(--color-bg-secondary);
  border: 1px solid #444;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.card-highlighted {
  border: 2px solid var(--color-primary);
  box-shadow: 0 8px 24px rgba(255, 193, 7, 0.15);
}

.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background-color: var(--color-success);
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--color-bg-main);
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #444;
  padding-bottom: 16px;
}

.modal-header h2 {
  margin: 0;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 28px;
  cursor: pointer;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  border-top: 1px solid #444;
  padding-top: 20px;
}
```

### Frontend: src/styles/Toast.css
```css
.toasts-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
}

.toast {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  animation: slideIn 0.3s ease-out;
}

.toast-success {
  background-color: var(--color-success);
  color: white;
}

.toast-error {
  background-color: var(--color-error);
  color: white;
}

.toast-info {
  background-color: #2196F3;
  color: white;
}

.toast-warning {
  background-color: var(--color-warning);
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

### Frontend: src/styles/responsive.css
```css
@media (max-width: 599px) {
  body { font-size: 12px; }
  h1 { font-size: 20px; }
  h2 { font-size: 18px; }
  .dashboard-container { padding: 16px; }
  button, input { min-height: 44px; }
}

@media (min-width: 600px) and (max-width: 1023px) {
  .dashboard-container { padding: 24px; }
}

@media (min-width: 1024px) {
  .dashboard-container { padding: 40px; max-width: 1200px; margin: 0 auto; }
}
```

---

## INSTRUCCIONES FINALES PARA CLAUDE CODE + SUPERPOWERS

1. **Lee esta especificación completa del PROMPT y los PRDs**

2. **Crea la estructura de carpetas:**
   - `frikiquest/backend/` y `frikiquest/frontend/`

3. **Usa Superpowers para crear todos los archivos en orden:**
   - Backend: package.json, .env, .env.example, src/config.js, src/schema.sql, src/db.js, middleware, controllers, routes, utils, index.js, seed.js
   - Frontend: package.json, vite.config.js, .env, .env.example, public/index.html, src/main.jsx, src/App.jsx, src/index.css, pages, components, context, hooks, services, styles, utils

4. **Valida mientras creas:**
   - Sintaxis JavaScript correcta
   - Imports/requires correctos
   - Rutas relativas coinciden
   - JSON válido en package.json

5. **Después de crear todo:**
   - Reporta qué archivos se crearon exitosamente
   - Reporta si hay errores de sintaxis
   - Lista todos los endpoints backend
   - Confirma que la estructura es completa

6. **Testing:**
   - Verifica que backend compila (require('./backend/src/index.js'))
   - Verifica que frontend compila (require('./frontend/vite.config.js'))

---

## RESUMEN

**Backend:**
- 5 controladores: auth, challenges, results, leaderboards, users
- 5 routes: auth, challenges, results, leaderboard, users
- SQLite con 4 tablas: users, daily_challenges, results, user_stats
- JWT auth, bcrypt password hashing
- Express CORS + body-parser

**Frontend:**
- 5 páginas: Login, SignUp, Dashboard, Profile, NotFound
- 10+ componentes: Header, Button, Input, Card, Modal, Toast, etc
- React Context para AuthContext + AppContext
- Hooks personalizados: useAuth, useLocalStorage
- 6 servicios API: auth, challenge, result, leaderboard, user, base API
- CSS custom (sin librerías, puro CSS)
- Responsive: mobile, tablet, desktop

**Colores:** Amarillo #FFC107, Negro #1F1F1F, Blanco #FFFFFF, Gris #2A2A2A, Text #B0B0B0

Empieza ahora. Reporta tu progreso paso a paso.
