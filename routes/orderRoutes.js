const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const adminAuth = require('../middlewares/adminAuth');

// Public routes (no authentication required)
router.post('/', orderController.createOrder);
router.get('/number/:orderNumber', orderController.getOrderByNumber);

// Admin routes (authentication required)
router.post('/admin', adminAuth, orderController.createOrder);
router.get('/', adminAuth, orderController.getAllOrders);
router.get('/stats', adminAuth, orderController.getOrderStats);
router.get('/status/:status', adminAuth, orderController.getOrdersByStatus);
router.get('/:id', adminAuth, orderController.getOrderById);
router.put('/:id/status', adminAuth, orderController.updateOrderStatus);
router.put('/:id/payment', adminAuth, orderController.updatePaymentStatus);
router.put('/:id/date', adminAuth, orderController.updateOrderDate);
router.delete('/:id', adminAuth, orderController.deleteOrder);

module.exports = router;
