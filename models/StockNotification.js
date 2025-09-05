const mongoose = require('mongoose');

const stockNotificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  isNotified: {
    type: Boolean,
    default: false
  },
  notifiedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate notifications for same email and product
stockNotificationSchema.index({ email: 1, productId: 1 }, { unique: true });

// Ensure virtuals are included when converting to JSON
stockNotificationSchema.set('toJSON', { virtuals: true });
stockNotificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StockNotification', stockNotificationSchema);
