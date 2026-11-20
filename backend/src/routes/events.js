const express = require('express');
const eventController = require('../controllers/eventController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.get('/active', authenticateToken, eventController.getActive);
router.get('/:id/image', eventController.getImage);
router.get('/', authenticateToken, requireAdmin, eventController.list);
router.post('/', authenticateToken, requireAdmin, eventController.create);
router.put('/:id', authenticateToken, requireAdmin, eventController.update);
router.delete('/:id', authenticateToken, requireAdmin, eventController.remove);

module.exports = router;
