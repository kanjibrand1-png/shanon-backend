// routes/demoRoutes.js
const express = require('express');
const { createDemoRequest } = require('../controllers/demoRequestController');
const router = express.Router();

router.post('/', createDemoRequest);
module.exports = router;
