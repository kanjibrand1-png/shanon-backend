const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Verify token endpoint
router.get('/verify', authController.verifyToken);

// Refresh token endpoint
router.post('/refresh', authController.refreshToken);

module.exports = router;
