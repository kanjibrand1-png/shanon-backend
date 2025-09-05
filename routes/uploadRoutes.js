const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const adminAuth = require('../middlewares/adminAuth');

// Upload image (requires authentication)
router.post('/image', adminAuth, uploadController.uploadImage, uploadController.handleImageUpload);

// Delete image (requires authentication)
router.delete('/image/:filename', adminAuth, uploadController.deleteImage);

module.exports = router;

