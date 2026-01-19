const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function checkOrder(orderId) {
  try {
    console.log(`\n=== Checking order ${orderId} ===\n`);

    // Check order details
    const orderResult = await pool.query(
      `SELECT order_id, status, progress, picker_id, created_at, updated_at, claimed_at 
       FROM orders WHERE order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      console.log('❌ Order not found');
      return;
    }

    const order = orderResult.rows[0];
    console.log('Order details:');
    console.log(`  Status: ${order.status}`);
    console.log(`  Progress: ${order.progress}%`);
    console.log(`  Picker ID: ${order.picker_id || 'NULL'}`);
    console.log(`  Created: ${order.created_at}`);
    console.log(`  Updated: ${order.updated_at}`);
    console.log(`  Claimed: ${order.claimed_at}\n`);

    // Check pick tasks
    const tasksResult = await pool.query(
      `SELECT pick_task_id, order_id, status, started_at, completed_at, skipped_at 
       FROM pick_tasks WHERE order_id = $1 
       ORDER BY created_at`,
      [orderId]
    );

    console.log(`Pick tasks: ${tasksResult.rowCount} total`);
    tasksResult.rows.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.pick_task_id} - ${task.status}`);
      if (task.started_at) {
        console.log(`      Started: ${task.started_at}`);
      }
      if (task.completed_at) {
        console.log(`      Completed: ${task.completed_at}`);
      }
      if (task.skipped_at) {
        console.log(`      Skipped: ${task.skipped_at}`);
      }
    });
    console.log();

    // Check order items
    const itemsResult = await pool.query(
      `SELECT order_item_id, sku, quantity, picked_quantity, status 
       FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    console.log(`Order items: ${itemsResult.rowCount} total`);
    itemsResult.rows.forEach((item, i) => {
      console.log(
        `  ${i + 1}. ${item.sku} - ${item.picked_quantity}/${item.quantity} (${item.status})`
      );
    });
    console.log();

    // Check if order should show in picker queue
    console.log('=== Checking if order should show in picker queue ===\n');

    // Check queue query conditions
    console.log('Queue query requires:');
    console.log("1. status IN ('PENDING', 'PICKING', 'IN_PROGRESS')");
    console.log(
      `   Current status: ${order.status} - ${order.status === 'PENDING' || order.status === 'PICKING' || order.status === 'IN_PROGRESS' ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log();
    console.log('2. Has items in order_items table');
    console.log(
      `   Item count: ${itemsResult.rowCount} - ${itemsResult.rowCount > 0 ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log();
    console.log('3. Has pick tasks in pick_tasks table');
    console.log(
      `   Task count: ${tasksResult.rowCount} - ${tasksResult.rowCount > 0 ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log();
    console.log('4. Progress < 100');
    console.log(
      `   Progress: ${order.progress}% - ${order.progress < 100 ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log();

    const allPass =
      (order.status === 'PENDING' ||
        order.status === 'PICKING' ||
        order.status === 'IN_PROGRESS') &&
      itemsResult.rowCount > 0 &&
      tasksResult.rowCount > 0 &&
      order.progress < 100;

    console.log(`Overall result: ${allPass ? '✅ ORDER SHOULD SHOW' : '❌ ORDER WILL NOT SHOW'}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

const orderId = process.argv[2] || 'ORD-20260114-5978';
checkOrder(orderId);
