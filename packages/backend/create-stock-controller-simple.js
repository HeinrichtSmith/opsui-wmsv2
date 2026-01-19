/**
 * Simple script to create a stock controller user directly
 * Run with: node create-stock-controller-simple.js
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
};

async function createStockController() {
  const pool = new Pool(poolConfig);

  try {
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');

    // Check if STOCK_CONTROLLER role exists in enum
    const enumCheck = await pool.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'user_role'::regtype
      AND enumlabel = 'STOCK_CONTROLLER'
    `);

    if (enumCheck.rows.length === 0) {
      console.log('⚠️  STOCK_CONTROLLER role not found in enum. Adding it...');
      await pool.query("ALTER TYPE user_role ADD VALUE 'STOCK_CONTROLLER' BEFORE 'SUPERVISOR'");
      console.log('✅ Added STOCK_CONTROLLER to user_role enum');
    } else {
      console.log('✅ STOCK_CONTROLLER role already exists in enum');
    }

    // Check if stock count tables exist
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'stock_counts'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('⚠️  stock_counts table not found. Creating it...');

      // Create stock_counts table
      await pool.query(`
        CREATE TABLE stock_counts (
          count_id VARCHAR(50) PRIMARY KEY,
          bin_location VARCHAR(20) NOT NULL REFERENCES bin_locations(bin_id) ON DELETE RESTRICT,
          type VARCHAR(20) NOT NULL CHECK (type IN ('FULL', 'CYCLIC', 'SPOT')),
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED')),
          created_by VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          verified_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL
        )
      `);

      // Create stock_count_items table
      await pool.query(`
        CREATE TABLE stock_count_items (
          count_item_id VARCHAR(50) PRIMARY KEY,
          count_id VARCHAR(50) NOT NULL REFERENCES stock_counts(count_id) ON DELETE CASCADE,
          sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
          expected_quantity INTEGER NOT NULL DEFAULT 0,
          counted_quantity INTEGER NOT NULL DEFAULT 0,
          variance INTEGER NOT NULL DEFAULT 0,
          notes TEXT
        )
      `);

      // Create indexes
      await pool.query('CREATE INDEX idx_stock_counts_bin_location ON stock_counts(bin_location)');
      await pool.query('CREATE INDEX idx_stock_counts_status ON stock_counts(status)');
      await pool.query('CREATE INDEX idx_stock_count_items_count_id ON stock_count_items(count_id)');

      console.log('✅ Created stock control tables');
    } else {
      console.log('✅ Stock control tables already exist');
    }

    // Check if user already exists
    const email = 'stockcontroller@wms.local';
    const userId = 'USR-SC001';

    const existingUser = await pool.query(
      'SELECT user_id, email, role FROM users WHERE user_id = $1 OR email = $2',
      [userId, email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log('ℹ️  User already exists:', user);

      if (user.role !== 'STOCK_CONTROLLER') {
        await pool.query(
          "UPDATE users SET role = 'STOCK_CONTROLLER' WHERE user_id = $1",
          [userId]
        );
        console.log('✅ Updated user role to STOCK_CONTROLLER');
      }
    } else {
      // Create new user
      const password = 'Stock123!';
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      await pool.query(
        `INSERT INTO users (user_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'STOCK_CONTROLLER')`,
        [userId, 'Stock Controller', email, passwordHash]
      );

      console.log('✅ Created stock controller user');
    }

    // Verify user
    const verifyUser = await pool.query(
      'SELECT user_id, name, email, role, active FROM users WHERE email = $1',
      [email]
    );

    console.log('\n' + '='.repeat(60));
    console.log('STOCK CONTROLLER ACCOUNT READY');
    console.log('='.repeat(60));
    console.log('User ID:', verifyUser.rows[0].user_id);
    console.log('Name:', verifyUser.rows[0].name);
    console.log('Email:', verifyUser.rows[0].email);
    console.log('Role:', verifyUser.rows[0].role);
    console.log('Active:', verifyUser.rows[0].active);
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('   URL: http://localhost:5173/login');
    console.log('   Email:', email);
    console.log('   Password: Stock123!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createStockController();
