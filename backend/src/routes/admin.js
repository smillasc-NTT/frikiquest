const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/users', adminController.listUsers);
router.put('/users/:id/approve', adminController.approveUser);
router.put('/users/:id/role', adminController.updateRole);
router.delete('/users/:id', adminController.deleteUser);
router.get('/users/:id/logs/:date', adminController.getUserDay);
router.delete('/users/:id/logs/:date', adminController.resetUserDay);

module.exports = router;
