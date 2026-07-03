const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/:id/stats', authenticateToken, userController.getUserStats);
router.put('/:id/avatar', authenticateToken, userController.updateAvatar);
router.put('/:id/password', authenticateToken, userController.updatePassword);
router.delete('/:id', authenticateToken, userController.deleteUser);

module.exports = router;
