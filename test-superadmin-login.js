const axios = require('axios');

async function testSuperAdminLogin() {
  try {
    // First, let's login as superadmin
    console.log('Logging in as superadmin...');
    const loginResponse = await axios.post('http://localhost:5000/api/superadmins/login', {
      email: 'admin@shanon-technologies.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('Superadmin login successful!');
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
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testSuperAdminLogin();
