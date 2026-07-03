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

      await db.run('INSERT INTO users (id, name, email, password_hash, status) VALUES (?, ?, ?, ?, \'pending\')', [userId, name, email, passwordHash]);
      await db.run('INSERT INTO user_stats (user_id, total_score, results_count) VALUES (?, 0, 0)', [userId]);

      res.status(201).json({ message: 'Cuenta creada. Un administrador debe aprobar tu acceso antes de que puedas iniciar sesión.', pending: true });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Missing fields', code: 'VALIDATION_ERROR' });

      const user = await db.get('SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?', [email]);
      if (!user) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });

      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por un administrador', code: 'PENDING_APPROVAL' });
      }

      const token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiry });
      res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at }, token });
    } catch (err) {
      next(err);
    }
  },

  getMe: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const user = await db.get('SELECT id, name, email, created_at, avatar_url, role FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });

      const stats = await db.get('SELECT total_score, results_count FROM user_stats WHERE user_id = ?', [userId]);
      const totalScore = stats?.total_score || 0;

      const resultDates = await db.all(
        `SELECT DISTINCT c.date FROM results r
         JOIN daily_challenges c ON r.challenge_id = c.id
         WHERE r.user_id = ? ORDER BY c.date DESC`,
        [userId]
      );
      const streak = helpers.calculateStreak(resultDates.map(r => r.date));
      const rank = helpers.getRank(totalScore);

      res.json({
        id: user.id, name: user.name, email: user.email, role: user.role,
        createdAt: user.created_at, avatarUrl: user.avatar_url || null,
        totalScore, streak, rank
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
