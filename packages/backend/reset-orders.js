/**
 * Script to reset stuck orders to claimable state
 */

const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from backend directory
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function resetOrders() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('\n=== RESETTING STUCK ORDERS ===\n');

    // Step 1: Reset orders stuck in PICKING status without a picker
    console.log('1. Resetting orders in PICKING status without picker...');
    const result1 = await client.query(`
      UPDATE orders
      SET status = 'PENDING',
          picker_id = NULL,
          claimed_at = NULL
      WHERE status = 'PICKING' 
        AND (picker_id IS NULL OR picker_id = '')
    `);
    console.log(`   Updated ${result1.rowCount} orders`);

    // Step 2: Reset all orders in PICKING status (clear all picker assignments)
    console.log('\n2. Resetting all orders in PICKING status...');
    const result2 = await client.query(`
      UPDATE orders
      SET status = 'PENDING',
          picker_id = NULL,
          claimed_at = NULL
      WHERE status = 'PICKING'
    `);
    console.log(`   Updated ${result2.rowCount} orders`);

    // Step 3: Delete orphaned pick tasks
    console.log('\n3. Deleting orphaned pick tasks...');
    const result3 = await client.query(`
      DELETE FROM pick_tasks
      WHERE order_id NOT IN (SELECT order_id FROM orders)
    `);
    console.log(`   Deleted ${result3.rowCount} orphaned tasks`);

    // Step 4: Verify changes
    console.log('\n4. Orders available for claiming:');
    const pendingOrders = await client.query(`
      SELECT 
        order_id,
        status,
        picker_id,
        customer_name,
        priority,
        created_at
      FROM orders
      WHERE status = 'PENDING'
      ORDER BY priority DESC, created_at ASC
      LIMIT 10
    `);

    if (pendingOrders.rows.length === 0) {
      console.log('   No orders available');
    } else {
      pendingOrders.rows.forEach(order => {
        console.log(`   ${order.order_id} - ${order.customer_name} (${order.priority})`);
      });
    }

    // Step 5: Check specific order ORD-20260112-7802
    console.log('\n5. Specific order: ORD-20260112-7802');
    const specificOrder = await client.query(`
      SELECT 
        order_id,
        status,
        picker_id,
        CASE 
          WHEN status = 'PENDING' AND (picker_id IS NULL OR picker_id = '') THEN 'Can be claimed: YES'
          ELSE 'Can be claimed: NO'
        END as claimable
      FROM orders
      WHERE order_id = 'ORD-20260112-7802'
    `);

    if (specificOrder.rows.length === 0) {
      console.log('   ❌ Order not found');
    } else {
      const order = specificOrder.rows[0];
      console.log(`   Status: ${order.status}`);
      console.log(`   Picker: ${order.picker_id || 'None'}`);
      console.log(`   ${order.claimable}`);
    }

    await client.end();
    console.log('\n=== RESET COMPLETE ===\n');
    console.log('✅ All orders have been reset to claimable state');
    console.log('✅ You can now try claiming orders from the frontend');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

resetOrders();
