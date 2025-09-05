const StockNotification = require('../models/StockNotification');
const Product = require('../models/Product');
const { sendRestockNotification } = require('../config/email');

// Subscribe to stock notification (Public route)
exports.subscribeToStockNotification = async (req, res) => {
  try {
    const { email, productId } = req.body;

    // Validate required fields
    if (!email || !productId) {
      return res.status(400).json({ error: 'Email and product ID are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already subscribed
    const existingNotification = await StockNotification.findOne({
      email,
      productId
    });

    if (existingNotification) {
      return res.status(400).json({ error: 'You are already subscribed to notifications for this product' });
    }

    // Create new notification subscription
    const notification = new StockNotification({
      email,
      productId,
      productName: product.name
    });

    await notification.save();

    res.status(201).json({
      message: 'Successfully subscribed to stock notifications',
      notification: {
        id: notification._id,
        email: notification.email,
        productName: notification.productName,
        createdAt: notification.createdAt
      }
    });

  } catch (err) {
    console.error('Error subscribing to stock notification:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You are already subscribed to notifications for this product' });
    }
    res.status(500).json({ error: 'Failed to subscribe to stock notification' });
  }
};

// Get all stock notifications (Admin & Super Admin)
exports.getAllStockNotifications = async (req, res) => {
  try {
    const notifications = await StockNotification.find()
      .populate('productId', 'title image price')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching stock notifications:', err);
    res.status(500).json({ error: 'Failed to fetch stock notifications' });
  }
};

// Get stock notifications by product (Admin & Super Admin)
exports.getStockNotificationsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const notifications = await StockNotification.find({ productId })
      .populate('productId', 'title image price')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching stock notifications by product:', err);
    res.status(500).json({ error: 'Failed to fetch stock notifications' });
  }
};

// Delete stock notification (Admin & Super Admin)
exports.deleteStockNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await StockNotification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Stock notification not found' });
    }

    await StockNotification.findByIdAndDelete(id);
    res.json({ message: 'Stock notification deleted successfully' });
  } catch (err) {
    console.error('Error deleting stock notification:', err);
    res.status(500).json({ error: 'Failed to delete stock notification' });
  }
};

// Check and send restock notifications (Admin & Super Admin)
exports.checkAndSendRestockNotifications = async (req, res) => {
  try {
    const { productId } = req.params;

    // Get all pending notifications for this product
    const notifications = await StockNotification.find({
      productId,
      isNotified: false
    }).populate('productId', 'title image price');

    if (notifications.length === 0) {
      return res.json({ message: 'No pending notifications for this product' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let notifiedCount = 0;
    const failedNotifications = [];

    // Check each notification
    for (const notification of notifications) {
      if (product.stock > 0) {
        try {
          // Send restock notification email
          await sendRestockNotification(notification, product);
          
          // Mark as notified
          notification.isNotified = true;
          notification.notifiedAt = new Date();
          await notification.save();
          
          notifiedCount++;
        } catch (emailError) {
          console.error('Failed to send restock notification:', emailError);
          failedNotifications.push(notification.email);
        }
      }
    }

    res.json({
      message: `Restock notifications processed`,
      notifiedCount,
      failedCount: failedNotifications.length,
      failedEmails: failedNotifications
    });

  } catch (err) {
    console.error('Error checking restock notifications:', err);
    res.status(500).json({ error: 'Failed to process restock notifications' });
  }
};

// Unsubscribe from stock notification (Public route)
exports.unsubscribeFromStockNotification = async (req, res) => {
  try {
    const { email, productId } = req.body;

    if (!email || !productId) {
      return res.status(400).json({ error: 'Email and product ID are required' });
    }

    const notification = await StockNotification.findOneAndDelete({
      email,
      productId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification subscription not found' });
    }

    res.json({ message: 'Successfully unsubscribed from stock notifications' });
  } catch (err) {
    console.error('Error unsubscribing from stock notification:', err);
    res.status(500).json({ error: 'Failed to unsubscribe from stock notification' });
  }
};
