const express = require('express');
const resultController = require('../controllers/resultController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.post('/', authenticateToken, resultController.submitResult);
router.get('/my-today', authenticateToken, resultController.getMyResultToday);
router.delete('/:id', authenticateToken, requireAdmin, resultController.deleteResult);

module.exports = router;
