// backend/test-auth.js
const axios = require('axios');

async function run() {
  try {
    // REGISTER
    await axios.post('http://localhost:5000/api/auth/register', {
      username: 'user1',
      password: '123456',
      role: 'user'
    });
    console.log('User registered');

    // LOGIN
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'user1',
      password: '123456'
    });

    console.log('Login successful:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('Error:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

run();
