const { Pool } = require('pg');

async function dropTrigger() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    console.log('Dropping order_state_changes trigger...\n');

    // Drop the trigger
    await pool.query('DROP TRIGGER IF EXISTS order_state_changes ON orders');
    console.log('✓ Trigger dropped successfully');

    console.log('\nThe trigger has been permanently disabled.');
    console.log('Order state changes will no longer be logged.');
    console.log('This prevents duplicate key errors during order claims.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

dropTrigger();
