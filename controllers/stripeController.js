const stripe = require('../config/stripe');
const Order = require('../models/Order');
const { sendOrderEmails } = require('../config/email');

// Create payment intent for Stripe
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'eur', orderData } = req.body;

    // Validate required fields
    if (!amount || !orderData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount and order data are required' 
      });
    }

    // Convert amount to cents (Stripe expects amounts in smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      metadata: {
        customerEmail: orderData.customer?.email || '',
        orderTotal: amount.toString(),
        orderItems: orderData.items?.length?.toString() || '0'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create payment intent' 
    });
  }
};

// Confirm payment and create order
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderData } = req.body;

    if (!paymentIntentId || !orderData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment intent ID and order data are required' 
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment not completed' 
      });
    }

    // Create order in database
    const {
      customer,
      shippingAddress,
      items,
      subtotal,
      shippingFee,
      total,
      shippingCountry,
      shippingFeeDetails
    } = orderData;

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
      subtotal: subtotal,
      shippingFee: shippingFee || 0,
      total: total,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      paymentIntentId: paymentIntentId,
      status: 'confirmed',
      shippingCountry: shippingCountry,
      shippingFeeDetails: shippingFeeDetails
    });

    const savedOrder = await newOrder.save();

    // Send email notifications (non-blocking)
    try {
      await sendOrderEmails(savedOrder);
      console.log('Email notifications sent successfully for online payment');
    } catch (emailError) {
      console.error('Email notification failed for online payment:', emailError);
      // Don't fail the order creation if email fails
    }

    res.json({
      success: true,
      order: savedOrder,
      message: 'Payment confirmed and order created successfully'
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to confirm payment' 
    });
  }
};

// Handle Stripe webhook
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      
      // Update order status if needed
      try {
        const updatedOrder = await Order.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          { 
            paymentStatus: 'paid',
            status: 'confirmed'
          },
          { new: true }
        );
        
        // Send email notifications if order was found and updated
        if (updatedOrder) {
          try {
            await sendOrderEmails(updatedOrder);
            console.log('Email notifications sent successfully via webhook');
          } catch (emailError) {
            console.error('Email notification failed via webhook:', emailError);
          }
        }
      } catch (error) {
        console.error('Error updating order status:', error);
      }
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('PaymentIntent failed:', failedPayment.id);
      
      // Update order status if needed
      try {
        await Order.findOneAndUpdate(
          { paymentIntentId: failedPayment.id },
          { 
            paymentStatus: 'failed',
            status: 'cancelled'
          }
        );
      } catch (error) {
        console.error('Error updating failed order status:', error);
      }
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook
};
