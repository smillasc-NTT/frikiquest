const express = require('express');
const logController = require('../controllers/logController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/today', authenticateToken, logController.getToday);
router.post('/today', authenticateToken, logController.markToday);

module.exports = router;
