const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order Information
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Customer Information
  customer: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true }
  },
  
  // Shipping Address
  shippingAddress: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  },
  
  // Order Items
  items: [{
    productId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: { type: String }
  }],
  
  // Financial Information
  subtotal: { type: Number, required: true },
  shippingFee: { type: Number, required: true },
  total: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['online', 'delivery'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentIntentId: {
    type: String,
    sparse: true
  },
  
  // Shipping Information
  shippingCountry: { type: String, required: true },
  shippingFeeDetails: {
    country: { type: String },
    fee: { type: Number },
    currency: { type: String }
  },
  
  // Admin Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['SuperAdmin', 'Admin']
  },
  
}, { timestamps: true });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get count of orders for today
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const orderCount = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    const orderNumber = `ORD-${year}${month}${day}-${String(orderCount + 1).padStart(4, '0')}`;
    this.orderNumber = orderNumber;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
