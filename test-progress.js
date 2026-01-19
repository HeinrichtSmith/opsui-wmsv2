const { query } = require('./packages/backend/dist/db/client.js');

(async () => {
  try {
    // Get a PICKING order with its pick tasks
    const orderResult = await query(
      `SELECT order_id, status, picker_id FROM orders ORDER BY updated_at DESC LIMIT 5`
    );

    if (orderResult.rows.length === 0) {
      console.log('No orders found');
      process.exit(0);
    }

    // Find first PICKING order
    const pickingOrder = orderResult.rows.find(o => o.status === 'PICKING');

    if (!pickingOrder) {
      console.log('No PICKING orders found. Recent orders:');
      orderResult.rows.forEach(o => {
        console.log(`  ${o.order_id}: ${o.status} (picker: ${o.picker_id || 'none'})`);
      });
      process.exit(0);
    }

    const orderId = pickingOrder.orderId; // Database returns camelCase
    console.log('\n=== Order ID:', orderId, '(status:', pickingOrder.status, ') ===\n');

    if (!orderId) {
      console.log('ERROR: orderId is undefined!');
      console.log('Picking order object:', pickingOrder);
      process.exit(1);
    }

    // Get pick tasks
    const pickTasks = await query(
      `SELECT pick_task_id, sku, quantity, picked_quantity, status 
       FROM pick_tasks 
       WHERE order_id = $1 
       ORDER BY pick_task_id`,
      [orderId]
    );

    console.log('Pick Tasks:');
    pickTasks.rows.forEach(pt => {
      console.log(
        `  ${pt.pick_task_id}: ${pt.sku} - ${pt.picked_quantity}/${pt.quantity} (${pt.status})`
      );
    });

    // Calculate progress manually
    const totalQuantity = pickTasks.rows.reduce((sum, pt) => sum + pt.quantity, 0);
    const totalPicked = pickTasks.rows.reduce((sum, pt) => sum + pt.picked_quantity, 0);
    const progress = totalQuantity > 0 ? Math.round((totalPicked / totalQuantity) * 100) : 0;

    console.log('\nManual Calculation:');
    console.log(`  Total Quantity: ${totalQuantity}`);
    console.log(`  Total Picked: ${totalPicked}`);
    console.log(`  Progress: ${progress}%`);

    // Test the actual SQL query
    const sqlProgress = await query(
      `SELECT 
        CASE 
          WHEN o.status = 'PICKING' 
          THEN COALESCE(
            (
              SELECT ROUND(
                CASE 
                  WHEN SUM(pt.quantity) = 0 THEN 0
                  ELSE (SUM(pt.picked_quantity) / SUM(pt.quantity) * 100)::numeric
                END,
                0
              ) FROM pick_tasks pt WHERE pt.order_id = o.order_id
            ),
            0
          )
          ELSE 0 
        END as progress
      FROM orders o WHERE order_id = $1`,
      [orderId]
    );

    console.log('\nSQL Calculation:');
    console.log(`  SQL Result rows: ${sqlProgress.rows.length}`);
    console.log(`  SQL Result:`, JSON.stringify(sqlProgress.rows, null, 2));
    if (sqlProgress.rows.length > 0 && sqlProgress.rows[0] !== undefined) {
      console.log(`  SQL Progress: ${sqlProgress.rows[0].progress}%`);
    } else {
      console.log('  ERROR: No SQL result rows or row is undefined');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
