/**
 * Test database connection and show environment variables
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

console.log('=== ENVIRONMENT VARIABLES ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD value:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length);
console.log('');

// Try reading .env file directly
try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  console.log('=== .env FILE CONTENT (first 500 chars) ===');
  console.log(envContent.substring(0, 500));
} catch (err) {
  console.log('Error reading .env:', err.message);
}
console.log('');

// Test connection with hardcoded password
async function testConnection() {
  console.log('=== TESTING CONNECTION ===');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password'  // Hardcoded for testing
  });
  
  try {
    console.log('Attempting to connect with hardcoded credentials...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    
    await client.end();
    console.log('✅ Connection test passed');
    console.log('');
    console.log('You can now run: node reset-orders.js');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    await client.end();
  }
}

testConnection();