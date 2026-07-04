# Instrucciones: Crear FrikiQuest Backend en Claude Code + Superpowers

## Fase 1: Inicializar Proyecto Node.js

### 1.1 Estructura de carpetas
```
frikiquest/
├── src/
│   ├── index.js              # Entry point principal
│   ├── config.js             # Variables de entorno y configuración
│   ├── db.js                 # Inicialización SQLite
│   ├── middleware/
│   │   ├── auth.js           # Autenticación JWT
│   │   └── errorHandler.js   # Manejo de errores
│   ├── routes/
│   │   ├── auth.js           # POST /signup, /login, GET /me
│   │   ├── challenges.js     # GET /today, POST / (admin)
│   │   ├── results.js        # POST /results, GET /my-today
│   │   └── leaderboard.js    # GET /daily, /monthly
│   ├── users.js              # GET /{id}/stats, PUT /{id}/password, DELETE /{id}
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── challengeController.js
│   │   ├── resultController.js
│   │   └── leaderboardController.js
│   ├── utils/
│   │   ├── validators.js     # Validaciones de inputs
│   │   └── helpers.js        # Funciones auxiliares (scoring, streak, etc)
│   └── schema.sql            # Schema SQLite
├── data/
│   └── frikiquest.db         # Base de datos SQLite (generada)
├── .env                       # Variables de entorno
├── .env.example
├── package.json
└── seed.js                    # Script para popular datos demo

```

### 1.2 Crear package.json
```bash
cd frikiquest
npm init -y
```

Luego edita `package.json` y reemplaza con:
```json
{
  "name": "frikiquest-backend",
  "version": "1.0.0",
  "description": "API REST para FrikiQuest gamification app",
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

### 1.3 Instalar dependencias
```bash
npm install
```

---

## Fase 2: Crear Archivos Base

### 2.1 `.env.example`
```
NODE_ENV=development
PORT=3000
JWT_SECRET=tu_secret_muy_largo_y_aleatorio_minimo_32_caracteres
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
DATABASE_PATH=./data/frikiquest.db
```

### 2.2 `.env` (local, no commitear)
```
NODE_ENV=development
PORT=3000
JWT_SECRET=frikiquest_secret_dev_12345678901234567890
JWT_EXPIRY=7d
CORS_ORIGIN=*
DATABASE_PATH=./data/frikiquest.db
```

### 2.3 `src/config.js`
```javascript
require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databasePath: process.env.DATABASE_PATH || './data/frikiquest.db',
  
  // Validaciones
  minPasswordLength: 8,
  maxNameLength: 100,
  maxTextResultLength: 500,
  maxNumericValue: 10000,
};
```

### 2.4 `src/schema.sql`
```sql
-- Crear tablas
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_challenges_date ON daily_challenges(date);
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_challenge ON results(challenge_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(submitted_at);
```

### 2.5 `src/db.js`
```javascript
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Crear carpeta data si no existe
const dataDir = path.dirname(config.databasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(config.databasePath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeSchema();
  }
});

// Promisify db.run y db.get para usar async/await
db.run = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

db.get = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.all = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

function initializeSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error initializing schema:', err);
    } else {
      console.log('Database schema initialized');
    }
  });
}

module.exports = db;
```

### 2.6 `src/middleware/auth.js`
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ 
      error: 'Token missing',
      code: 'MISSING_TOKEN'
    });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
```

### 2.7 `src/middleware/errorHandler.js`
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

### 2.8 `src/utils/validators.js`
```javascript
const config = require('../config');

const validators = {
  // Email válido
  isValidEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Password >= 8 chars
  isValidPassword: (password) => {
    return password && password.length >= config.minPasswordLength;
  },

  // Nombre no vacío, <= 100 chars
  isValidName: (name) => {
    return name && name.trim().length > 0 && name.length <= config.maxNameLength;
  },

  // Validar valor según tipo de reto
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

### 2.9 `src/utils/helpers.js`
```javascript
const crypto = require('crypto');

const helpers = {
  // Generar UUID simple
  generateId: () => {
    return crypto.randomBytes(16).toString('hex').toLowerCase();
  },

  // Calcular score según tipo de reto
  calculateScore: (value, type, criteria = null, minValue = null) => {
    if (type === 'numeric' && minValue) {
      const ratio = parseInt(value) / minValue;
      return Math.min(Math.floor(ratio * 100), 100);
    }
    if (type === 'boolean') {
      return value === 'true' || value === true ? 100 : 0;
    }
    if (type === 'text') {
      return 100; // Asumir que enviar texto = completado
    }
    return 100; // Default
  },

  // Calcular racha de días consecutivos
  calculateStreak: async (userId, db) => {
    // TODO: Implementar lógica de streak
    return 0;
  },

  // Obtener hoy en formato YYYY-MM-DD
  getTodayDate: () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  },
};

module.exports = helpers;
```

---

## Fase 3: Crear Controladores y Rutas

### 3.1 `src/controllers/authController.js`
```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const validators = require('../utils/validators');
const helpers = require('../utils/helpers');

const authController = {
  // POST /api/auth/signup
  signup: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      // Validaciones
      if (!validators.isValidName(name)) {
        return res.status(400).json({
          error: 'Invalid name',
          code: 'VALIDATION_ERROR'
        });
      }
      if (!validators.isValidEmail(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          code: 'VALIDATION_ERROR'
        });
      }
      if (!validators.isValidPassword(password)) {
        return res.status(400).json({
          error: `Password must be at least ${config.minPasswordLength} characters`,
          code: 'VALIDATION_ERROR'
        });
      }

      // Verificar email no existe
      const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return res.status(400).json({
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Crear usuario
      const userId = helpers.generateId();
      await db.run(
        'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        [userId, name, email, passwordHash]
      );

      // Crear stats
      await db.run(
        'INSERT INTO user_stats (user_id, total_score, results_count) VALUES (?, 0, 0)',
        [userId]
      );

      // Generar JWT
      const token = jwt.sign(
        { sub: userId, name, email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiry }
      );

      res.status(201).json({
        user: { id: userId, name, email, createdAt: new Date().toISOString() },
        token
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Buscar usuario
      const user = await db.get('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Verificar password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Generar JWT
      const token = jwt.sign(
        { sub: user.id, name: user.name, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiry }
      );

      res.json({
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
        token
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/auth/me
  getMe: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const user = await db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'NOT_FOUND'
        });
      }

      const stats = await db.get('SELECT total_score FROM user_stats WHERE user_id = ?', [userId]);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
        totalScore: stats?.total_score || 0
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
```

### 3.2 `src/routes/auth.js`
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

---

## Fase 4: Crear el Servidor Principal

### 4.1 `src/index.js`
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const db = require('./db');
const { errorHandler } = require('./middleware/errorHandler');

// Importar rutas
const authRoutes = require('./routes/auth');
// TODO: Importar otras rutas cuando estén listas

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/auth', authRoutes);
// TODO: app.use('/api/challenges', challengeRoutes);
// TODO: app.use('/api/results', resultRoutes);
// TODO: app.use('/api/leaderboard', leaderboardRoutes);
// TODO: app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND'
  });
});

// Error handler (debe ser último)
app.use(errorHandler);

// Iniciar servidor
app.listen(config.port, () => {
  console.log(`[${new Date().toISOString()}] FrikiQuest API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) console.error(err);
    process.exit(0);
  });
});
```

---

## Fase 5: Crear Seed Script (datos demo)

### 5.1 `seed.js`
> ⚠️ Solo para desarrollo local — no ejecutar `npm run seed` contra producción. Las cuentas y contraseña que crea son de ejemplo, no las reutilices en un entorno real.
```javascript
const db = require('./src/db');
const bcrypt = require('bcryptjs');
const { generateId, getTodayDate } = require('./src/utils/helpers');

async function seed() {
  try {
    console.log('Seeding database...');

    // Crear usuarios demo
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const userId = generateId();
      const passwordHash = await bcrypt.hash('<tu_password_local>', 10);
      await db.run(
        'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        [userId, `Superfriki ${i}`, `user${i}@test.com`, passwordHash]
      );
      await db.run(
        'INSERT INTO user_stats (user_id, total_score, results_count) VALUES (?, ?, ?)',
        [userId, Math.random() * 1000, Math.floor(Math.random() * 20)]
      );
      users.push(userId);
    }

    // Crear reto de hoy
    const challengeId = generateId();
    const today = getTodayDate();
    await db.run(
      `INSERT INTO daily_challenges (id, date, title, description, criteria, type, min_value, max_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        challengeId,
        today,
        '50 Flexiones',
        'Completa 50 flexiones con buena forma',
        'Mínimo esperado: 50 flexiones válidas',
        'numeric',
        50,
        500
      ]
    );

    // Crear resultados demo
    for (let i = 0; i < users.length; i++) {
      const resultId = generateId();
      const value = 50 + Math.floor(Math.random() * 100);
      await db.run(
        `INSERT INTO results (id, user_id, challenge_id, value, score)
         VALUES (?, ?, ?, ?, ?)`,
        [resultId, users[i], challengeId, value, Math.min(100, Math.floor((value / 50) * 100))]
      );
      
      // Actualizar stats
      await db.run(
        `UPDATE user_stats SET total_score = total_score + ?, results_count = results_count + 1
         WHERE user_id = ?`,
        [Math.min(100, Math.floor((value / 50) * 100)), users[i]]
      );
    }

    console.log('✓ Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding:', err);
    process.exit(1);
  }
}

seed();
```

---

## Fase 6: Integración con Superpowers

### 6.1 Instalar Superpowers Plugin
```bash
npm install @superpowers/claude
```

### 6.2 Crear `src/superpowers.js`
```javascript
const { createSuperpowers } = require('@superpowers/claude');

const superpowers = createSuperpowers({
  // Superpowers te permitirá hacer tasks automáticas en Claude Code
  // Ej: modificar archivos, ejecutar tests, buscar en la base de datos
});

module.exports = superpowers;
```

### 6.3 En `src/index.js`, importar Superpowers
```javascript
// Al inicio
const superpowers = require('./superpowers');

// Después de app.listen()
app.locals.superpowers = superpowers;

// Ahora Superpowers puede leer/escribir archivos, consultar DB, etc
```

---

## Fase 7: Conectar Stitch con Backend

### 7.1 En Stitch, configurar API Base URL
- Ir a Settings → API Configuration
- Base URL: `http://localhost:3000` (desarrollo) o tu URL de producción
- Headers por defecto: `Authorization: Bearer {token}` (será suplido por Stitch tras login)

### 7.2 En Stitch, crear Data Sources
- Crear data source "AuthAPI" → POST /api/auth/login, /api/auth/signup
- Crear data source "ChallengeAPI" → GET /api/challenges/today
- Crear data source "LeaderboardAPI" → GET /api/leaderboard/daily, /api/leaderboard/monthly
- Crear data source "ResultAPI" → POST /api/results

### 7.3 Flujo de Token en Stitch
- Tras login exitoso, guardar token en Stitch variable global
- Adjuntar a todas las requests subsecuentes en header `Authorization: Bearer {token}`
- Si 401, mostrar modal de reautenticación y redirigir a Login

---

## Fase 8: Testing Local

### 8.1 Iniciar servidor
```bash
npm run dev
```

Esperado:
```
[2024-05-28T...] FrikiQuest API running on port 3000
Environment: development
Connected to SQLite database
Database schema initialized
```

### 8.2 Seed datos demo
```bash
npm run seed
```

### 8.3 Test endpoints manualmente (Postman, curl, etc)

**Signup**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos",
    "email": "carlos@test.com",
    "password": "<tu_password_local>"
  }'
```

Respuesta:
```json
{
  "user": { "id": "...", "name": "Carlos", "email": "carlos@test.com", "createdAt": "..." },
  "token": "eyJ..."
}
```

**Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@test.com",
    "password": "<tu_password_local>"
  }'
```

**Get Me**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJ..."
```

---

## Fase 9: Completar Controladores Restantes

Una vez Auth funcione, crear:

### 9.1 `src/controllers/challengeController.js`
- GET /api/challenges/today
- POST /api/challenges (admin)

### 9.2 `src/controllers/resultController.js`
- POST /api/results
- GET /api/results/my-today

### 9.3 `src/controllers/leaderboardController.js`
- GET /api/leaderboard/daily
- GET /api/leaderboard/monthly

### 9.4 `src/routes/challenges.js`, `results.js`, `leaderboard.js`, `users.js`

---

## Checklist Final

- [ ] `npm install` completado
- [ ] `.env` creado con variables
- [ ] `src/` con todos los archivos base
- [ ] `src/index.js` inicia sin errores
- [ ] Schema SQLite creado y verificado
- [ ] Auth endpoints funcionan (signup/login/me)
- [ ] Superpowers integrado
- [ ] Stitch conectado a http://localhost:3000
- [ ] Datos demo creados con `npm run seed`
- [ ] Tests manuales de endpoints exitosos
- [ ] Variables de entorno configuradas para producción (.env.production)

---

## Próximos Pasos

1. Implementar challenge controller
2. Implementar result controller + scoring logic
3. Implementar leaderboard controller
4. Implementar users controller (profile, password change, delete)
5. Conectar Stitch con todos los endpoints
6. Testing E2E (UI + API)
7. Deploy a producción (Vercel/Railway + Firebase Hosting)
