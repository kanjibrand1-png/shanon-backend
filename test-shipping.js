const axios = require('axios');

async function testShippingFee() {
  try {
    // First, let's test the GET endpoint to see if it's accessible
    console.log('Testing GET /api/shipping/fees...');
    const getResponse = await axios.get('http://localhost:5000/api/shipping/fees');
    console.log('GET response:', getResponse.data);
    
    // Now test the POST endpoint (this will fail without auth, but we'll see the error)
    console.log('\nTesting POST /api/shipping/fees...');
    const postResponse = await axios.post('http://localhost:5000/api/shipping/fees', {
      country: 'Test Country',
      shippingFee: 10,
      currency: 'TND',
      isActive: true
    });
    console.log('POST response:', postResponse.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testShippingFee();
