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

      await db.run('INSERT INTO results (id, user_id, challenge_id, value, score) VALUES (?, ?, ?, ?, ?)', [resultId, userId, challengeId, String(value), score]);
      await db.run('UPDATE user_stats SET total_score = total_score + ?, results_count = results_count + 1, last_update = CURRENT_TIMESTAMP WHERE user_id = ?', [score, userId]);

      res.status(201).json({ id: resultId, userId, challengeId, value, score, submittedAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },

  getMyResultToday: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const today = helpers.getTodayDate();
      const result = await db.get('SELECT r.* FROM results r JOIN daily_challenges c ON r.challenge_id = c.id WHERE r.user_id = ? AND c.date = ?', [userId, today]);
      if (!result) return res.status(404).json({ error: 'No result found', code: 'NOT_FOUND' });

      res.json({ id: result.id, challengeId: result.challenge_id, value: result.value, score: result.score, submittedAt: result.submitted_at });
    } catch (err) {
      next(err);
    }
  },

  deleteResult: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await db.get('SELECT * FROM results WHERE id = ?', [id]);
      if (!result) return res.status(404).json({ error: 'Result not found', code: 'NOT_FOUND' });

      await db.run('UPDATE user_stats SET total_score = total_score - ?, results_count = results_count - 1 WHERE user_id = ?', [result.score, result.user_id]);
      await db.run('DELETE FROM results WHERE id = ?', [id]);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = resultController;
