const { Client } = require('pg');

async function resetOrders() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Delete all existing orders and related data
    console.log('Deleting existing orders...');
    await client.query('DELETE FROM order_state_changes');
    await client.query('DELETE FROM inventory_transactions');
    await client.query('DELETE FROM pick_tasks');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    console.log('✓ Deleted all orders');

    console.log('\nDatabase reset complete. Please run: node seed-random-orders.js');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

resetOrders();