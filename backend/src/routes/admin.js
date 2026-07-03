const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/users', adminController.listUsers);
router.put('/users/:id/approve', adminController.approveUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
