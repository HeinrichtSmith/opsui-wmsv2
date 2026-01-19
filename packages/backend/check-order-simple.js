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
      `SELECT order_id, status, progress, picker_id, updated_at, claimed_at 
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
    console.log(`  Updated: ${order.updated_at}`);
    console.log(`  Claimed: ${order.claimed_at}\n`);

    // Check pick tasks count only
    const tasksCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM pick_tasks WHERE order_id = $1`,
      [orderId]
    );
    console.log(`Pick tasks: ${tasksCountResult.rows[0].count} total\n`);

    // Check order items count only
    const itemsCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    console.log(`Order items: ${itemsCountResult.rows[0].count} total\n`);

    // Check if order should show in picker queue
    console.log('=== Checking if order should show in picker queue ===\n');

    const taskCount = parseInt(tasksCountResult.rows[0].count);
    const itemCount = parseInt(itemsCountResult.rows[0].count);

    console.log('Queue query requires:');
    console.log("1. status IN ('PENDING', 'PICKING')");
    console.log(
      `   Current status: ${order.status} - ${order.status === 'PENDING' || order.status === 'PICKING' ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log();
    console.log('2. Has items in order_items table');
    console.log(`   Item count: ${itemCount} - ${itemCount > 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log();
    console.log('3. Has pick tasks in pick_tasks table');
    console.log(`   Task count: ${taskCount} - ${taskCount > 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log();
    console.log('4. Progress < 100');
    console.log(
      `   Progress: ${order.progress}% - ${order.progress < 100 ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log();

    const allPass =
      (order.status === 'PENDING' || order.status === 'PICKING') &&
      itemCount > 0 &&
      taskCount > 0 &&
      order.progress < 100;

    console.log(`Overall result: ${allPass ? '✅ ORDER SHOULD SHOW' : '❌ ORDER WILL NOT SHOW'}`);
    console.log();

    if (!allPass) {
      console.log('ISSUE: Order has 0 items and/or 0 tasks');
      console.log("This is why it's not showing in the picker queue");
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

const orderId = process.argv[2] || 'ORD-20260114-5978';
checkOrder(orderId);
