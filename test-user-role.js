const axios = require('axios');

async function testUserRole() {
  try {
    // First, let's login to get a token
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/admins/login', {
      email: 'admin@shanon-technologies.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('Login successful!');
    console.log('User data:', user);
    console.log('User role:', user.role);
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Now test the auth verification endpoint
    console.log('\nTesting auth verification...');
    const verifyResponse = await axios.get('http://localhost:5000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Auth verification response:', verifyResponse.data);
    
    // Test shipping fees endpoint
    console.log('\nTesting shipping fees endpoint...');
    const shippingResponse = await axios.get('http://localhost:5000/api/shipping/fees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Shipping fees response:', shippingResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testUserRole();
