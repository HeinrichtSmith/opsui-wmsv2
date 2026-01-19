/**
 * Standalone script to fix admin user password
 * This doesn't require compilation, can run directly with Node.js
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables from current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function fixAdminUser() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    console.log('Hash:', passwordHash);
    
    // Delete existing admin user
    console.log('Deleting existing admin user...');
    await client.query('DELETE FROM users WHERE email = $1', ['admin@wms.local']);
    
    // Insert new admin user with correct hash
    console.log('Inserting new admin user...');
    await client.query(
      `INSERT INTO users (user_id, name, email, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      ['USR-ADMIN01', 'System Administrator', 'admin@wms.local', passwordHash, 'ADMIN']
    );
    
    // Verify insertion
    console.log('Verifying insertion...');
    const result = await client.query(
      'SELECT user_id, email, name, role FROM users WHERE email = $1',
      ['admin@wms.local']
    );
    
    console.log('✓ Admin user created successfully:');
    console.log('  Email: admin@wms.local');
    console.log('  Password: admin123');
    console.log('  User ID:', result.rows[0].user_id);
    console.log('  Role:', result.rows[0].role);
    
    await client.end();
    console.log('\n✓ Done! You can now login with:');
    console.log('  Email: admin@wms.local');
    console.log('  Password: admin123');
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixAdminUser();