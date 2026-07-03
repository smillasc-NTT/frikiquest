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

  listChallenges: async (req, res, next) => {
    try {
      const challenges = await db.all('SELECT * FROM daily_challenges ORDER BY date DESC');
      res.json(challenges.map(c => ({
        id: c.id, date: c.date, title: c.title, description: c.description,
        criteria: c.criteria, type: c.type, minValue: c.min_value, maxValue: c.max_value,
      })));
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
      await db.run('INSERT INTO daily_challenges (id, date, title, description, criteria, type, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [challengeId, date, title, description, criteria, type, minValue || null, maxValue || null]);

      res.status(201).json({ id: challengeId, date, title, description, criteria, type, minValue, maxValue });
    } catch (err) {
      next(err);
    }
  },

  updateChallenge: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { date, title, description, criteria, type, minValue, maxValue } = req.body;
      if (!date || !title || !description || !criteria || !type) return res.status(400).json({ error: 'Missing fields', code: 'VALIDATION_ERROR' });
      if (!['numeric', 'boolean', 'text'].includes(type)) return res.status(400).json({ error: 'Invalid type', code: 'VALIDATION_ERROR' });

      const existing = await db.get('SELECT id FROM daily_challenges WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ error: 'Challenge not found', code: 'NOT_FOUND' });

      const dateConflict = await db.get('SELECT id FROM daily_challenges WHERE date = ? AND id != ?', [date, id]);
      if (dateConflict) return res.status(400).json({ error: 'Challenge exists for this date', code: 'VALIDATION_ERROR' });

      await db.run(
        'UPDATE daily_challenges SET date = ?, title = ?, description = ?, criteria = ?, type = ?, min_value = ?, max_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [date, title, description, criteria, type, minValue || null, maxValue || null, id]
      );

      res.json({ id, date, title, description, criteria, type, minValue, maxValue });
    } catch (err) {
      next(err);
    }
  },

  deleteChallenge: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existing = await db.get('SELECT id FROM daily_challenges WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ error: 'Challenge not found', code: 'NOT_FOUND' });

      const results = await db.all('SELECT user_id, score FROM results WHERE challenge_id = ?', [id]);
      for (const r of results) {
        await db.run('UPDATE user_stats SET total_score = total_score - ?, results_count = results_count - 1 WHERE user_id = ?', [r.score, r.user_id]);
      }
      await db.run('DELETE FROM results WHERE challenge_id = ?', [id]);
      await db.run('DELETE FROM daily_challenges WHERE id = ?', [id]);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  getChallengeResults: async (req, res, next) => {
    try {
      const { id } = req.params;
      const challenge = await db.get('SELECT id FROM daily_challenges WHERE id = ?', [id]);
      if (!challenge) return res.status(404).json({ error: 'Challenge not found', code: 'NOT_FOUND' });

      const results = await db.all(
        `SELECT r.id, r.value, r.score, r.submitted_at, u.id as user_id, u.name, u.avatar_url
         FROM results r JOIN users u ON r.user_id = u.id
         WHERE r.challenge_id = ? ORDER BY r.score DESC`,
        [id]
      );
      res.json(results.map(r => ({
        id: r.id, userId: r.user_id, userName: r.name, avatarUrl: r.avatar_url || null,
        value: r.value, score: r.score, submittedAt: r.submitted_at,
      })));
    } catch (err) {
      next(err);
    }
  }
};

module.exports = challengeController;
