const axios = require('axios');

async function testShippingFeeWithAuth() {
  try {
    // First, let's login to get a token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/admins/login', {
      email: 'admin@shanon-technologies.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Test the POST endpoint with authentication
    console.log('\nTesting POST /api/shipping/fees with auth...');
    const postResponse = await axios.post('http://localhost:5000/api/shipping/fees', {
      country: 'Test Country',
      shippingFee: 10,
      currency: 'TND',
      isActive: 'Activ' // Test with the string value from the frontend
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('POST response:', postResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testShippingFeeWithAuth();
