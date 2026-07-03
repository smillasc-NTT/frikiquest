const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/daily', authenticateToken, leaderboardController.getDailyLeaderboard);
router.get('/monthly', authenticateToken, leaderboardController.getMonthlyLeaderboard);

module.exports = router;
