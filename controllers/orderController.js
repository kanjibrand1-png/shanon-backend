const Order = require('../models/Order');
const { sendOrderEmails } = require('../config/email');

// Create a new order (public route)
const createOrder = async (req, res) => {
  try {
    console.log('Creating order with data:', req.body);
    console.log('Request headers:', req.headers);
    console.log('=== DEBUG: Backend Received Data ===');
    console.log('Subtotal:', req.body.subtotal);
    console.log('Shipping Fee:', req.body.shippingFee);
    console.log('Total:', req.body.total);
    console.log('Items:', req.body.items);
    
    const {
      customer,
      shippingAddress,
      items,
      subtotal,
      shippingFee,
      total,
      paymentMethod,
      shippingCountry,
      shippingFeeDetails
    } = req.body;

    // Validate required fields
    if (!customer || !shippingAddress || !items || !subtotal || !total || !paymentMethod || !shippingCountry) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new order
    const newOrder = new Order({
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      },
      shippingAddress: {
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country
      },
      items: items.map(item => ({
        productId: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.images?.front || ''
      })),
      subtotal,
      shippingFee,
      total,
      paymentMethod,
      shippingCountry,
      shippingFeeDetails,
      currency: 'EUR',
      paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
      // For public orders, we don't set createdBy and createdByModel
    });

    await newOrder.save();
    
    console.log('Order created successfully:', newOrder.orderNumber);
    
    // Send email notifications (non-blocking)
    try {
      await sendOrderEmails(newOrder);
      console.log('Email notifications sent successfully');
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the order creation if email fails
    }
    
    res.status(201).json({
      success: true,
      order: newOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get all orders (admin route)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get order by ID (admin route)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// Get order by order number (public route)
const getOrderByNumber = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// Update order status (admin route)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      success: true,
      order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Update payment status (admin route)
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({ error: 'Payment status is required' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        paymentStatus,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      success: true,
      order,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};

// Update order date (admin route)
const updateOrderDate = async (req, res) => {
  try {
    const { createdAt } = req.body;
    
    console.log('updateOrderDate called with:', { orderId: req.params.id, createdAt });
    
    if (!createdAt) {
      return res.status(400).json({ error: 'Order date is required' });
    }
    
    // Find the order first to see current state
    const existingOrder = await Order.findById(req.params.id);
    console.log('Existing order createdAt:', existingOrder?.createdAt);
    
    // Use the native MongoDB driver to bypass Mongoose timestamps completely
    const db = Order.db;
    const collection = db.collection('orders');
    
    const mongoose = require('mongoose');
    // Convert the datetime string to a proper Date object
    // The input format is "YYYY-MM-DDTHH:MM" (local time)
    const [datePart, timePart] = createdAt.split('T');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');
    
    // Create a Date object in local time, then convert to UTC
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
    
    console.log('Input datetime:', createdAt);
    console.log('Local date object:', localDate);
    console.log('UTC date object:', utcDate);
    
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { 
        $set: {
          createdAt: utcDate,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('MongoDB update result:', result);
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Fetch the updated order using Mongoose
    const order = await Order.findById(req.params.id);
    console.log('Updated order createdAt:', order?.createdAt);
    
    res.json({
      success: true,
      order,
      message: 'Order date updated successfully'
    });
  } catch (error) {
    console.error('Error updating order date:', error);
    res.status(500).json({ error: 'Failed to update order date' });
  }
};

// Delete order (admin route)
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};

// Get orders by status (admin route)
const getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const orders = await Order.find({ status })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get order statistics (admin route)
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.json({
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderDate,
  deleteOrder,
  getOrdersByStatus,
  getOrderStats
};
