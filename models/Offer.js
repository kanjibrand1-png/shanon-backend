const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  priority: {
    type: Number,
    default: 1,
    min: 1
  },
  type: {
    type: String,
    enum: ['banner', 'discount', 'shipping', 'limited'],
    default: 'banner'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  minimumOrderAmount: {
    type: Number,
    default: 0
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: String
  }],
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
offerSchema.index({ status: 1, priority: 1 });
offerSchema.index({ startDate: 1, endDate: 1 });

// Method to check if offer is currently active
offerSchema.methods.isActive = function() {
  const now = new Date();
  const isStatusActive = this.status === 'active';
  const isWithinDateRange = (!this.startDate || now >= this.startDate) && 
                           (!this.endDate || now <= this.endDate);
  return isStatusActive && isWithinDateRange;
};

// Static method to get all active offers
offerSchema.statics.getActiveOffers = function() {
  return this.find({ status: 'active' })
    .sort({ priority: 1, createdAt: -1 });
};

// Static method to expire offers automatically
offerSchema.statics.expireExpiredOffers = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'active',
      endDate: { $lt: now, $ne: null }
    },
    {
      $set: { status: 'expired' }
    }
  );
  return result.modifiedCount;
};

module.exports = mongoose.model('Offer', offerSchema);
