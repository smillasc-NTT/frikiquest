const express = require('express');
const challengeController = require('../controllers/challengeController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.get('/today', authenticateToken, challengeController.getTodayChallenge);
router.get('/', authenticateToken, requireAdmin, challengeController.listChallenges);
router.post('/', authenticateToken, requireAdmin, challengeController.createChallenge);
router.get('/:id/results', authenticateToken, requireAdmin, challengeController.getChallengeResults);
router.put('/:id', authenticateToken, requireAdmin, challengeController.updateChallenge);
router.delete('/:id', authenticateToken, requireAdmin, challengeController.deleteChallenge);

module.exports = router;
