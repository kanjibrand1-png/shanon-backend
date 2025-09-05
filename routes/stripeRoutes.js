const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// Create payment intent
router.post('/create-payment-intent', stripeController.createPaymentIntent);

// Confirm payment
router.post('/confirm-payment', stripeController.confirmPayment);

// Stripe webhook (raw body required)
router.post('/webhook', express.raw({type: 'application/json'}), stripeController.handleWebhook);

module.exports = router;
