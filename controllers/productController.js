const Product = require('../models/Product');
const StockNotification = require('../models/StockNotification');
const { sendRestockNotification } = require('../config/email');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new product
exports.createProduct = async (req, res) => {
  try {
    console.log('🔍 Received product data:', JSON.stringify(req.body, null, 2));
    
    const {
      name,
      price,
      currency = 'EUR',
      image,
      hoverImage,
      category = [],
      description,
      features = [],
      stock = 0,
      isActive = true
    } = req.body;

    console.log('🔍 Extracted image field:', image);
    console.log('🔍 Extracted hoverImage field:', hoverImage);

    const productData = {
      name,
      price: parseFloat(price),
      currency,
      image,
      hoverImage: hoverImage || null,
      category: Array.isArray(category) ? category : [category],
      description,
      features: Array.isArray(features) ? features : [],
      stock: parseInt(stock),
      isActive,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin'
    };
    
    console.log('🔍 Final productData:', JSON.stringify(productData, null, 2));
    
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(400).json({ error: err.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    console.log('🔍 Update product - Received data:', JSON.stringify(req.body, null, 2));
    
    const {
      name,
      price,
      currency,
      image,
      hoverImage,
      category,
      description,
      features,
      stock,
      isActive
    } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(price && { price: parseFloat(price) }),
      ...(currency && { currency }),
      ...(image && { image }),
      ...(hoverImage !== undefined && { hoverImage: hoverImage || null }),
      ...(category && { category: Array.isArray(category) ? category : [category] }),
      ...(description && { description }),
      ...(features && { features: Array.isArray(features) ? features : [] }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: Date.now()
    };

    console.log('🔍 Update product - Final updateData:', JSON.stringify(updateData, null, 2));

    // Get the current product to check previous stock value
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = currentProduct.stock;
    const newStock = stock !== undefined ? parseInt(stock) : previousStock;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if stock was updated from 0 to a positive number
    if (previousStock === 0 && newStock > 0) {
      console.log(`🔄 Stock updated from ${previousStock} to ${newStock} - checking for notifications`);
      
      try {
        // Get all pending notifications for this product
        const notifications = await StockNotification.find({
          productId: req.params.id,
          isNotified: false
        });

        if (notifications.length > 0) {
          console.log(`📧 Found ${notifications.length} pending notifications for product ${product.name}`);
          
          let notifiedCount = 0;
          const failedNotifications = [];

          // Send notifications to all subscribers
          for (const notification of notifications) {
            try {
              await sendRestockNotification(notification, product);
              
              // Mark as notified
              notification.isNotified = true;
              notification.notifiedAt = new Date();
              await notification.save();
              
              notifiedCount++;
              console.log(`✅ Sent restock notification to ${notification.email}`);
            } catch (emailError) {
              console.error('❌ Failed to send restock notification:', emailError);
              failedNotifications.push(notification.email);
            }
          }

          console.log(`📧 Restock notifications sent: ${notifiedCount} successful, ${failedNotifications.length} failed`);
        } else {
          console.log(`ℹ️ No pending notifications found for product ${product.name}`);
        }
      } catch (notificationError) {
        console.error('❌ Error processing restock notifications:', notificationError);
        // Don't fail the product update if notification fails
      }
    }
    
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(400).json({ error: err.message });
  }
};

// Helper function to delete image by URL
const deleteImageByUrl = async (imageUrl) => {
  try {
    // Handle null, undefined, or empty strings
    if (!imageUrl || imageUrl === '' || imageUrl === null || imageUrl === undefined) {
      console.log('Skipping product image deletion - no valid image URL provided');
      return;
    }
    
    const filename = imageUrl.split('/').pop();
    if (!filename || filename === '') {
      console.log('Skipping product image deletion - invalid filename from URL:', imageUrl);
      return;
    }
    
    const filePath = path.join('uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted product image: ${filename}`);
    } else {
      console.log(`⚠️ Product image file not found: ${filename} (from URL: ${imageUrl})`);
    }
  } catch (err) {
    console.error('❌ Error deleting product image:', err);
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    console.log('🔍 Delete product - Product ID:', req.params.id);
    
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      console.log('🔍 Delete product - Product not found');
      return res.status(404).json({ error: 'Product not found' });
    }
    
    console.log('🔍 Delete product - Product deleted:', product.name);
    
    // Delete associated images if they exist and are not null/empty
    if (product.image && product.image.trim() !== '') {
      await deleteImageByUrl(product.image);
    }
    if (product.hoverImage && product.hoverImage.trim() !== '') {
      await deleteImageByUrl(product.hoverImage);
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
};

// Upload product image
exports.uploadImage = upload.single('image');



// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ 
      category: { $in: [category] },
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const products = await Product.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { category: { $in: [new RegExp(q, 'i')] } },
            { features: { $in: [new RegExp(q, 'i')] } }
          ]
        }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
