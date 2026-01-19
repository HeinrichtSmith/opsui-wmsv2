/**
 * Script to create a stock controller user account
 *
 * Usage:
 *   node scripts/createStockController.js [email] [password] [name]
 *
 * Example:
 *   node scripts/createStockController.js stockcontroller@wms.local Stock123! "Stock Controller"
 */

const bcrypt = require('bcrypt');
const { pool } = require('../dist/config/database');

async function createStockController(email = 'stockcontroller@wms.local', password = 'Stock123!', name = 'Stock Controller') {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate user ID
    const userId = 'USR-SC001';

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT user_id FROM users WHERE user_id = $1 OR email = $2',
      [userId, email]
    );

    if (existingUser.rows.length > 0) {
      console.log('User already exists:', existingUser.rows[0]);
      console.log('Skipping creation.');
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('Creating stock controller user...');
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log('Name:', name);
    console.log('Password:', password);
    console.log('Role: STOCK_CONTROLLER');

    // Insert user
    await client.query(
      `INSERT INTO users (user_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'STOCK_CONTROLLER')`,
      [userId, name, email, passwordHash]
    );

    await client.query('COMMIT');

    console.log('\n✅ Stock controller user created successfully!');
    console.log('\nLogin credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('\nYou can now login at: http://localhost:5173/login');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating stock controller:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];
const name = args[2];

createStockController(email, password, name).catch(console.error);
