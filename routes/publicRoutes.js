const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const Order = require('../models/Order');

// Public product routes
// GET /api/public/products - Get all active products
router.get('/products', productController.getAllProducts);

// GET /api/public/products/search - Search products
router.get('/products/search', productController.searchProducts);

// GET /api/public/products/category/:category - Get products by category
router.get('/products/category/:category', productController.getProductsByCategory);

// GET /api/public/products/:id - Get product by ID
router.get('/products/:id', productController.getProductById);

// Public order creation (for customers)
// POST /api/public/orders - Create new order (public)
router.post('/orders', async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      createdBy: null,
      createdByModel: 'Public'
    };
    
    const order = new Order(orderData);
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('items.productId', 'name image');
    
    res.status(201).json(populatedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/public/orders/:orderId - Get order by order ID (public)
router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .populate('items.productId', 'name image');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
