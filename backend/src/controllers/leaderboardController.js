const db = require('../db');
const helpers = require('../utils/helpers');

// XP per approved user between two dates (inclusive), highest first.
const RANKING_SQL = `
  SELECT u.id, u.name, u.avatar_url, COALESCE(SUM(l.xp), 0) AS score, COUNT(l.id) AS days_logged
  FROM users u
  LEFT JOIN daily_logs l ON l.user_id = u.id AND l.date BETWEEN ? AND ?
  WHERE u.status = 'approved'
  GROUP BY u.id
  ORDER BY score DESC, u.name ASC`;

const leaderboardController = {
  getDailyLeaderboard: async (req, res, next) => {
    try {
      const today = helpers.getTodayDate();
      const yesterday = helpers.getYesterdayDate();
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const todayRankings = await db.all(RANKING_SQL + ' LIMIT ? OFFSET ?', [today, today, limit, offset]);
      const yesterdayRankings = await db.all(RANKING_SQL, [yesterday, yesterday]);

      const yesterdayMap = {};
      yesterdayRankings.forEach((entry, idx) => { yesterdayMap[entry.id] = idx + 1; });

      const entries = todayRankings.map((entry, idx) => {
        const prevRank = yesterdayMap[entry.id];
        const change = prevRank ? prevRank - (offset + idx + 1) : null;
        return { rank: offset + idx + 1, userId: entry.id, userName: entry.name, avatarUrl: entry.avatar_url || null, score: entry.score, changeFromYesterday: change };
      });

      res.json({ date: today, entries });
    } catch (err) {
      next(err);
    }
  },

  getMonthlyLeaderboard: async (req, res, next) => {
    try {
      const [curYear, curMonth] = helpers.getTodayDate().split('-').map(Number);
      const year = parseInt(req.query.year) || curYear;
      const month = parseInt(req.query.month) || curMonth;
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const monthStr = year + '-' + String(month).padStart(2, '0');
      const monthStart = monthStr + '-01';
      const monthEnd = monthStr + '-31';

      const rankings = await db.all(RANKING_SQL + ' LIMIT ? OFFSET ?', [monthStart, monthEnd, limit, offset]);

      const entries = rankings.map((entry, idx) => ({
        rank: offset + idx + 1,
        userId: entry.id,
        userName: entry.name,
        avatarUrl: entry.avatar_url || null,
        score: entry.score,
        daysLogged: entry.days_logged,
      }));

      res.json({ period: monthStr, entries });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = leaderboardController;
