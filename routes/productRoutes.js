const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const adminAuth = require('../middlewares/adminAuth');

// Public routes
// GET /api/products - Get all products
router.get('/', productController.getAllProducts);

// GET /api/products/search - Search products
router.get('/search', productController.searchProducts);

// GET /api/products/category/:category - Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// GET /api/products/:id - Get product by ID
router.get('/:id', productController.getProductById);

// Admin routes (require authentication)
// POST /api/products - Create new product
router.post('/', adminAuth, productController.createProduct);

// PUT /api/products/:id - Update product
router.put('/:id', adminAuth, productController.updateProduct);

// DELETE /api/products/:id - Delete product
router.delete('/:id', adminAuth, productController.deleteProduct);

// POST /api/products/upload - Upload product image
router.post('/upload', adminAuth, productController.uploadImage, (req, res) => {
  if (req.file) {
    res.json({ 
      message: 'Image uploaded successfully',
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`
    });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});

module.exports = router;
