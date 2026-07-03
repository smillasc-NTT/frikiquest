const db = require('../db');
const helpers = require('../utils/helpers');

const leaderboardController = {
  getDailyLeaderboard: async (req, res, next) => {
    try {
      const today = helpers.getTodayDate();
      const yesterday = helpers.getYesterdayDate();
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const todayRankings = await db.all(
        'SELECT u.id, u.name, u.avatar_url, COALESCE(SUM(r.score), 0) as score FROM users u LEFT JOIN results r ON u.id = r.user_id LEFT JOIN daily_challenges c ON r.challenge_id = c.id AND c.date = ? GROUP BY u.id ORDER BY score DESC LIMIT ? OFFSET ?',
        [today, limit, offset]
      );

      const yesterdayRankings = await db.all(
        'SELECT u.id, u.name, COALESCE(SUM(r.score), 0) as score FROM users u LEFT JOIN results r ON u.id = r.user_id LEFT JOIN daily_challenges c ON r.challenge_id = c.id AND c.date = ? GROUP BY u.id ORDER BY score DESC',
        [yesterday]
      );

      const yesterdayMap = {};
      yesterdayRankings.forEach((entry, idx) => { yesterdayMap[entry.id] = idx + 1; });

      const entries = todayRankings.map((entry, idx) => {
        const prevRank = yesterdayMap[entry.id];
        let change = null;
        if (prevRank) change = prevRank - (idx + 1);
        return { rank: offset + idx + 1, userId: entry.id, userName: entry.name, avatarUrl: entry.avatar_url || null, score: entry.score || 0, changeFromYesterday: change };
      });

      res.json({ date: today, entries });
    } catch (err) {
      next(err);
    }
  },

  getMonthlyLeaderboard: async (req, res, next) => {
    try {
      const now = new Date();
      const year = parseInt(req.query.year) || now.getFullYear();
      const month = parseInt(req.query.month) || now.getMonth() + 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 100);
      const offset = parseInt(req.query.offset) || 0;

      const monthStr = year + '-' + String(month).padStart(2, '0');
      const monthStart = monthStr + '-01';
      const monthEnd = monthStr + '-31';

      const rankings = await db.all(
        'SELECT u.id, u.name, u.avatar_url, COALESCE(SUM(r.score), 0) as total_score, COUNT(r.id) as results_count FROM users u LEFT JOIN results r ON u.id = r.user_id LEFT JOIN daily_challenges c ON r.challenge_id = c.id AND c.date BETWEEN ? AND ? GROUP BY u.id ORDER BY total_score DESC LIMIT ? OFFSET ?',
        [monthStart, monthEnd, limit, offset]
      );

      const entries = rankings.map((entry, idx) => ({
        rank: offset + idx + 1,
        userId: entry.id,
        userName: entry.name,
        avatarUrl: entry.avatar_url || null,
        score: entry.total_score || 0,
        resultsCount: entry.results_count || 0
      }));

      res.json({ period: monthStr, entries });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = leaderboardController;
