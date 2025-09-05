// Load environment variables first
require('dotenv').config();

const { sendOrderEmails } = require('./config/email');

// Test email functionality with the new table structure
const testNewTableStructure = async () => {
  console.log('🧪 Testing new table structure...');
  
  // Create a test order object with size/variant information
  const testOrder = {
    _id: 'test-table-order-123',
    orderNumber: 'TABLE-TEST-001',
    customer: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'contact@shanon-technologies.com', // Use your actual email for testing
      phone: '+1234567890'
    },
    shippingAddress: {
      address: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country'
    },
    items: [
      {
        title: 'Little psycho - Streetwear collection',
        size: 'XL',
        price: 32.00,
        quantity: 1
      },
      {
        title: 'PAPAYA VL Development Board',
        size: '-',
        price: 600.00,
        quantity: 1
      }
    ],
    subtotal: 632.00,
    shippingFee: 8.00,
    total: 640.00,
    paymentMethod: 'online',
    paymentStatus: 'paid',
    status: 'confirmed',
    currency: 'TND',
    createdAt: new Date()
  };
  
  try {
    console.log('📧 Sending test email with new table structure...');
    await sendOrderEmails(testOrder);
    console.log('✅ Test completed successfully!');
    console.log('📬 Check your email inbox to see the new table structure.');
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
};

// Run the test
testNewTableStructure();
