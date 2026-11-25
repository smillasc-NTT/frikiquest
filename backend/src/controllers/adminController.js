const db = require('../db');
const helpers = require('../utils/helpers');

/** What a user has marked on `date`, plus the villain hits it produced. */
async function getDaySummary(userId, date) {
  const log = await db.get('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?', [userId, date]);
  const { count } = await db.get('SELECT COUNT(*) AS count FROM event_hits WHERE user_id = ? AND log_date = ?', [userId, date]);
  return {
    date,
    training: log?.training || null,
    steps: log?.steps || null,
    nutrition: log?.nutrition || null,
    xp: log?.xp || 0,
    hits: count,
  };
}

/** Validates :id and :date; sends the error response and returns false if invalid. */
async function checkUserDay(req, res) {
  const { id, date } = req.params;
  if (!helpers.isValidDate(date) || date > helpers.getTodayDate()) {
    res.status(400).json({ error: 'Fecha no válida', code: 'VALIDATION_ERROR' });
    return false;
  }
  const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) {
    res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    return false;
  }
  return true;
}

const adminController = {
  getUserDay: async (req, res, next) => {
    try {
      if (!(await checkUserDay(req, res))) return;
      res.json(await getDaySummary(req.params.id, req.params.date));
    } catch (err) {
      next(err);
    }
  },

  /**
   * Wipes a user's marks for one day: removes the XP and the villain hits (the
   * villain recovers that life). If the day is today, it can be marked again.
   */
  resetUserDay: async (req, res, next) => {
    try {
      if (!(await checkUserDay(req, res))) return;
      const { id, date } = req.params;
      const summary = await getDaySummary(id, date);

      const hits = await db.run('DELETE FROM event_hits WHERE user_id = ? AND log_date = ?', [id, date]);
      const logs = await db.run('DELETE FROM daily_logs WHERE user_id = ? AND date = ?', [id, date]);
      // A manual heal can't outlive the hits it was cancelling, or new hits would be invisible.
      await db.run(`UPDATE events SET damage_adjust =
        MAX(damage_adjust, -(SELECT COUNT(*) FROM event_hits WHERE event_id = events.id))`);
      if (!hits.changes && !logs.changes) {
        return res.status(404).json({ error: 'No hay nada marcado ese día', code: 'NOTHING_TO_RESET' });
      }

      res.json({ date, xpRemoved: summary.xp, hitsRemoved: hits.changes });
    } catch (err) {
      next(err);
    }
  },

  listUsers: async (req, res, next) => {
    try {
      const { status } = req.query;
      let sql = 'SELECT id, name, email, role, status, created_at FROM users';
      const params = [];
      if (status === 'pending' || status === 'approved') {
        sql += ' WHERE status = ?';
        params.push(status);
      }
      sql += ' ORDER BY created_at DESC';
      const users = await db.all(sql, params);
      res.json(users.map(u => ({
        id: u.id, name: u.name, email: u.email, role: u.role,
        status: u.status, createdAt: u.created_at
      })));
    } catch (err) {
      next(err);
    }
  },

  approveUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await db.get('SELECT id, status FROM users WHERE id = ?', [id]);
      if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      if (user.status === 'approved') return res.status(400).json({ error: 'User already approved', code: 'ALREADY_APPROVED' });

      await db.run("UPDATE users SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
      res.json({ message: 'User approved' });
    } catch (err) {
      next(err);
    }
  },

  updateRole: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: 'Rol no válido', code: 'VALIDATION_ERROR' });
      }
      const target = await db.get('SELECT id, status FROM users WHERE id = ?', [id]);
      if (!target) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });

      // Also guarantees there is always at least one admin left.
      if (id === req.user.sub) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol', code: 'CANNOT_CHANGE_OWN_ROLE' });
      }
      if (target.status !== 'approved') {
        return res.status(400).json({ error: 'Aprueba al usuario antes de cambiar su rol', code: 'PENDING_APPROVAL' });
      }

      await db.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, id]);
      res.json({ message: 'Role updated', role });
    } catch (err) {
      next(err);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const target = await db.get('SELECT id, role FROM users WHERE id = ?', [id]);
      if (!target) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });

      if (id === req.user.sub) {
        return res.status(400).json({ error: 'No puedes eliminarte a ti mismo desde el panel de administración', code: 'CANNOT_DELETE_SELF' });
      }

      if (target.role === 'admin') {
        const adminCount = await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
        if (adminCount.count <= 1) {
          return res.status(400).json({ error: 'No se puede eliminar al último administrador', code: 'LAST_ADMIN' });
        }
      }

      // event_hits are kept on purpose so the villain doesn't heal.
      await db.run('DELETE FROM daily_logs WHERE user_id = ?', [id]);
      await db.run('DELETE FROM users WHERE id = ?', [id]);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
