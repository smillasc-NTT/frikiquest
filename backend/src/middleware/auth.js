const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

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

// The role is read from the database, not from the token: role changes and
// deleted accounts take effect at once instead of when the token expires.
const requireAdmin = async (req, res, next) => {
  try {
    const user = await db.get('SELECT role FROM users WHERE id = ?', [req.user?.sub]);
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only', code: 'FORBIDDEN' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticateToken, requireAdmin };
