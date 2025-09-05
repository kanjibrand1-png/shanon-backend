const express = require('express');
const router = express.Router();
const stockNotificationController = require('../controllers/stockNotificationController');
const adminAuth = require('../middlewares/adminAuth');

// Public routes (no authentication required)
router.post('/subscribe', stockNotificationController.subscribeToStockNotification);
router.post('/unsubscribe', stockNotificationController.unsubscribeFromStockNotification);

// Protected routes (Admin and Super Admin only)
router.use(adminAuth); // Apply admin authentication middleware to all routes below

// Admin routes
router.get('/admin', stockNotificationController.getAllStockNotifications);
router.get('/admin/product/:productId', stockNotificationController.getStockNotificationsByProduct);
router.delete('/admin/:id', stockNotificationController.deleteStockNotification);
router.post('/admin/check-restock/:productId', stockNotificationController.checkAndSendRestockNotifications);

module.exports = router;
