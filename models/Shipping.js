const mongoose = require('mongoose');

const shippingSchema = new mongoose.Schema({
  country: { 
    type: String, 
    required: true,
    trim: true,
    unique: true
  },
  shippingFee: { 
    type: Number, 
    required: true,
    min: 0
  },
  currency: { 
    type: String, 
    enum: ['TND', 'EUR', 'USD'],
    default: 'EUR' 
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
  timestamps: true
});

// Update the updatedAt field before saving
shippingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure virtuals are included when converting to JSON
shippingSchema.set('toJSON', { virtuals: true });
shippingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Shipping', shippingSchema);
