const db = require('../db');

const adminController = {
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

      await db.run('DELETE FROM results WHERE user_id = ?', [id]);
      await db.run('DELETE FROM user_stats WHERE user_id = ?', [id]);
      await db.run('DELETE FROM users WHERE id = ?', [id]);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
