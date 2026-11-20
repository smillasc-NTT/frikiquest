const db = require('../db');
const config = require('../config');
const validators = require('../utils/validators');
const helpers = require('../utils/helpers');
const events = require('../utils/events');

function toLogPayload(log, date) {
  return {
    date,
    training: log?.training || null,
    steps: log?.steps || null,
    nutrition: log?.nutrition || null,
    xp: log?.xp || 0,
  };
}

const logController = {
  getToday: async (req, res, next) => {
    try {
      const today = helpers.getTodayDate();
      const log = await db.get('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?', [req.user.sub, today]);
      res.json(toLogPayload(log, today));
    } catch (err) {
      next(err);
    }
  },

  /** Marks one category for today. Marks are final: they can't be changed. */
  markToday: async (req, res, next) => {
    try {
      const userId = req.user.sub;
      const { category, value } = req.body;
      if (!validators.isValidLogEntry(category, value)) {
        return res.status(400).json({ error: 'Invalid category or value', code: 'VALIDATION_ERROR' });
      }

      const today = helpers.getTodayDate();
      const xpGained = value === 'done' ? config.xpPerItem : 0;

      await db.run('INSERT OR IGNORE INTO daily_logs (id, user_id, date) VALUES (?, ?, ?)', [helpers.generateId(), userId, today]);
      // `category` is whitelisted by isValidLogEntry, so interpolating the column name is safe.
      const update = await db.run(
        `UPDATE daily_logs SET ${category} = ?, xp = xp + ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND date = ? AND ${category} IS NULL`,
        [value, xpGained, userId, today]
      );
      if (update.changes === 0) {
        return res.status(409).json({ error: 'Ya has marcado esto hoy', code: 'ALREADY_MARKED' });
      }

      let hit = false;
      let event = null;
      const active = await events.getActiveEvent(today);
      if (active) {
        if (value === 'done') hit = await events.registerHit(active, userId, today, category);
        event = await events.toEventPayload(active, today);
      }

      const log = await db.get('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?', [userId, today]);
      res.status(201).json({ log: toLogPayload(log, today), xpGained, hit, event });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = logController;
