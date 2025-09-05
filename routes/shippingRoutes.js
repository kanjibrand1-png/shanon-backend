const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const adminAuth = require('../middlewares/adminAuth');

// Public routes (no authentication required)
router.get('/fees', shippingController.getAllShippingFees);
router.get('/fees/country/:country', shippingController.getShippingFeeByCountry);
router.get('/countries', shippingController.getActiveShippingCountries);

// Public shipping fee by country (for frontend)
router.get('/public/country/:country', shippingController.getShippingFeeByCountry);

// Admin routes (authentication required)
router.get('/fees/:id', adminAuth, shippingController.getShippingFeeById);
router.post('/fees', adminAuth, shippingController.createShippingFee);
router.put('/fees/:id', adminAuth, shippingController.updateShippingFee);
router.delete('/fees/:id', adminAuth, shippingController.deleteShippingFee);

module.exports = router;
