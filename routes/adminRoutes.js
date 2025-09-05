const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const orderController = require('../controllers/orderController');
const productController = require('../controllers/productController');
const superAdminAuth = require('../middlewares/superAdminAuth');
const adminAuth = require('../middlewares/adminAuth');

// Order routes for admins (must come before /:id routes)
// GET /api/admin/orders - Get all orders
router.get('/orders', adminAuth, orderController.getAllOrders);

// POST /api/admin/orders - Create new order
router.post('/orders', adminAuth, orderController.createOrder);

// PATCH /api/admin/orders/:id/status - Update order status (MORE SPECIFIC FIRST)
router.patch('/orders/:id/status', adminAuth, orderController.updateOrderStatus);

// DELETE /api/admin/orders/:id - Delete order
router.delete('/orders/:id', adminAuth, orderController.deleteOrder);

// GET /api/admin/orders/:id - Get order by ID (LESS SPECIFIC LAST)
router.get('/orders/:id', adminAuth, orderController.getOrderById);

// Product routes for admins (for order creation)
// GET /api/admin/products - Get all products
router.get('/products', adminAuth, productController.getAllProducts);

// Admin management routes (Super Admin only)
// GET /api/admins (Super Admin only)
router.get('/', superAdminAuth, adminController.getAllAdmins);

// POST /api/admins (Super Admin only)
router.post('/', superAdminAuth, adminController.createAdmin);

// POST /api/admins/login (Public - for admin login)
router.post('/login', adminController.loginAdmin);

// PUT /api/admins/profile (Admin only - for updating own profile)
router.put('/profile', adminAuth, adminController.updateAdminProfile);

// DELETE /api/admins/:id (Super Admin only)
router.delete('/:id', superAdminAuth, adminController.deleteAdmin);

// PUT /api/admins/:id (Super Admin only - for managing other admins)
router.put('/:id', superAdminAuth, adminController.updateAdmin);

// PATCH /api/admins/:id/toggle-status (Super Admin only - for toggling admin status)
router.patch('/:id/toggle-status', superAdminAuth, adminController.toggleAdminStatus);

module.exports = router;
