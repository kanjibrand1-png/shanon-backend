const axios = require('axios');

async function testCountryRoute() {
  try {
    console.log('Testing GET /api/shipping/fees/country/Test Country...');
    const response = await axios.get('http://localhost:5000/api/shipping/fees/country/Test Country');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testCountryRoute();
