const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  currency: { 
    type: String, 
    enum: ['TND', 'EUR', 'USD'],
    default: 'EUR'
  },
  image: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return v && typeof v === 'string' && v.trim() !== '';
      },
      message: 'Product image is required and cannot be empty'
    }
  },
  hoverImage: { 
    type: String, 
    default: null,
    validate: {
      validator: function(v) {
        return v === null || v === undefined || (typeof v === 'string' && v.trim() !== '');
      },
      message: 'Hover image must be null or a non-empty string'
    }
  },
  category: {
    type: [String],
    enum: [
      'Development Boards',
      'Arduino',
      'Raspberry Pi',
      'ESP32',
      'STM32',
      'Microcontrollers',
      'Sensors',
      'Modules',
      'Other'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  features: [String],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  createdByModel: {
    type: String,
    enum: ['SuperAdmin', 'Admin'],
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Clean empty strings to null before saving
productSchema.pre('save', function(next) {
  if (this.hoverImage === '') {
    this.hoverImage = null;
  }
  next();
});

// Update the updatedAt field before saving
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure virtuals are included when converting to JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
