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

  updateAvatar: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const { avatarUrl } = req.body;
      if (!avatarUrl) return res.status(400).json({ error: 'Missing avatarUrl', code: 'VALIDATION_ERROR' });
      if (!avatarUrl.startsWith('data:image/')) return res.status(400).json({ error: 'Invalid image format', code: 'VALIDATION_ERROR' });
      // ~700KB base64 limit (≈500KB image)
      if (avatarUrl.length > 700000) return res.status(400).json({ error: 'Image too large (max ~500KB)', code: 'VALIDATION_ERROR' });

      await db.run('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, userId]);
      res.json({ avatarUrl });
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
