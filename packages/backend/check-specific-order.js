const { query } = require('./src/db/client');

async function checkOrder(orderId) {
  try {
    console.log(`\n=== Checking order ${orderId} ===\n`);

    // Check order details
    const orderResult = await query(
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
    const tasksResult = await query(
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
    const itemsResult = await query(
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

    // Check metrics query result for this order
    const metricsResult = await query(
      `
      WITH active_pickers AS (
        SELECT user_id, name 
        FROM users 
        WHERE role = 'PICKER' AND active = true
      ),
      current_orders AS (
        SELECT DISTINCT ON (picker_id)
          picker_id, 
          order_id,
          progress,
          updated_at
        FROM orders
        WHERE status = 'PICKING'
        ORDER BY picker_id, updated_at DESC
      ),
      current_tasks AS (
        SELECT 
          pt.order_id,
          pt.pick_task_id,
          pt.started_at
        FROM pick_tasks pt
        WHERE pt.status IN ('PENDING', 'IN_PROGRESS')
        AND pt.started_at = (
          SELECT MAX(pt2.started_at)
          FROM pick_tasks pt2
          WHERE pt2.order_id = pt.order_id
          AND pt2.status IN ('PENDING', 'IN_PROGRESS')
        )
      )
      SELECT 
        u.user_id as picker_id,
        u.name as picker_name,
        o.order_id as current_order_id,
        COALESCE(o.progress, 0) as order_progress,
        ct.pick_task_id as current_task,
        COALESCE(o.updated_at, ct.started_at) as last_viewed_at
      FROM active_pickers u
      LEFT JOIN current_orders o ON u.user_id = o.picker_id
      LEFT JOIN current_tasks ct ON o.order_id = ct.order_id
      WHERE o.order_id = $1
      ORDER BY u.name
    `,
      [orderId]
    );

    if (metricsResult.rowCount === 0) {
      console.log('❌ Order NOT found in metrics query result');
      console.log('This means the order will NOT show in picker-activity\n');
    } else {
      console.log('✅ Order FOUND in metrics query result:');
      const result = metricsResult.rows[0];
      console.log(`  Picker: ${result.picker_name}`);
      console.log(`  Current Order: ${result.current_order_id}`);
      console.log(`  Progress: ${result.order_progress}%`);
      console.log(`  Current Task: ${result.current_task || 'NULL'}`);
      console.log(`  Last Viewed At: ${result.last_viewed_at}\n`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

// Run check for specific order
const orderId = process.argv[2] || 'ORD-20260112-8762';
checkOrder(orderId);
