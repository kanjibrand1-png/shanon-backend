const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const adminAuth = require('../middlewares/adminAuth');

// All routes require authentication
router.use(adminAuth);

// Get dashboard stats
router.get('/stats', dashboardController.getDashboardStats);

// Get sales over time
router.get('/sales-over-time', dashboardController.getSalesOverTime);

// Get analytics data
router.get('/analytics', dashboardController.getAnalytics);

// Get real-time metrics
router.get('/real-time', dashboardController.getRealTimeMetrics);

// Individual analytics endpoints for frontend
router.get('/product-performance', dashboardController.getProductPerformance);
router.get('/order-analytics', dashboardController.getOrderAnalytics);
router.get('/sales-by-gender', dashboardController.getSalesByGender);
router.get('/geographic-sales', dashboardController.getGeographicSales);
router.get('/customer-analytics', dashboardController.getCustomerAnalytics);
router.get('/real-time-metrics', dashboardController.getRealTimeMetrics);

module.exports = router;

