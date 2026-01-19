/**
 * Script to diagnose order claiming issues
 * Checks for orders stuck in incorrect states
 */

const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function diagnoseOrders() {
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
    
    console.log('\n=== ORDER STATUS DIAGNOSTIC ===\n');
    
    // Check all orders with their status
    console.log('1. All orders:');
    const ordersResult = await client.query(`
      SELECT order_id, status, picker_id, customer_name, priority, created_at, claimed_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (ordersResult.rows.length === 0) {
      console.log('   No orders found in database');
    } else {
      ordersResult.rows.forEach(order => {
        console.log(`   ${order.order_id}`);
        console.log(`     Status: ${order.status}`);
        console.log(`     Picker: ${order.picker_id || 'None'}`);
        console.log(`     Priority: ${order.priority}`);
        console.log(`     Customer: ${order.customer_name}`);
        console.log(`     Created: ${order.created_at}`);
        if (order.claimed_at) {
          console.log(`     Claimed at: ${order.claimed_at}`);
        }
        console.log('');
      });
    }
    
    // Check for orders stuck in PICKING status with no picker
    console.log('\n2. Orders in PICKING status (should have picker):');
    const stuckPickingResult = await client.query(`
      SELECT order_id, status, picker_id, customer_name
      FROM orders
      WHERE status = 'PICKING' AND (picker_id IS NULL OR picker_id = '')
    `);
    
    if (stuckPickingResult.rows.length === 0) {
      console.log('   ✓ No stuck orders found');
    } else {
      console.log('   ⚠️  Found stuck orders:');
      stuckPickingResult.rows.forEach(order => {
        console.log(`     ${order.order_id} - ${order.customer_name} (no picker assigned)`);
      });
    }
    
    // Check for orders that can be claimed (PENDING)
    console.log('\n3. Orders available for claiming (PENDING status):');
    const pendingResult = await client.query(`
      SELECT order_id, status, picker_id, customer_name, priority
      FROM orders
      WHERE status = 'PENDING'
      ORDER BY priority DESC, created_at ASC
    `);
    
    if (pendingResult.rows.length === 0) {
      console.log('   No orders available for claiming');
    } else {
      pendingResult.rows.forEach(order => {
        console.log(`     ${order.order_id} - ${order.customer_name} (${order.priority} priority)`);
      });
    }
    
    // Check order ORD-20260112-7802 specifically
    console.log('\n4. Specific order: ORD-20260112-7802');
    const specificOrder = await client.query(`
      SELECT * FROM orders WHERE order_id = 'ORD-20260112-7802'
    `);
    
    if (specificOrder.rows.length === 0) {
      console.log('   ❌ Order not found in database');
    } else {
      const order = specificOrder.rows[0];
      console.log(`   Order ID: ${order.order_id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Picker: ${order.picker_id || 'None'}`);
      console.log(`   Can be claimed: ${order.status === 'PENDING' && !order.picker_id ? 'YES' : 'NO'}`);
      
      if (order.status !== 'PENDING') {
        console.log(`   ⚠️  Issue: Order is in '${order.status}' status but should be 'PENDING' to be claimable`);
      }
      
      if (order.picker_id) {
        console.log(`   ⚠️  Issue: Order already claimed by picker ${order.picker_id}`);
      }
    }
    
    // Check pick tasks
    console.log('\n5. Pick tasks:');
    const pickTasksResult = await client.query(`
      SELECT pt.*, o.customer_name, o.status as order_status
      FROM pick_tasks pt
      LEFT JOIN orders o ON pt.order_id = o.order_id
      LIMIT 10
    `);
    
    if (pickTasksResult.rows.length === 0) {
      console.log('   No pick tasks found');
    } else {
      pickTasksResult.rows.forEach(task => {
        console.log(`   ${task.pick_task_id}`);
        console.log(`     Order: ${task.order_id} (${task.order_status})`);
        console.log(`     SKU: ${task.sku}`);
        console.log(`     Status: ${task.status}`);
        console.log(`     Picked: ${task.picked_quantity}/${task.quantity}`);
        console.log('');
      });
    }
    
    await client.end();
    console.log('\n=== DIAGNOSTIC COMPLETE ===\n');
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

diagnoseOrders();