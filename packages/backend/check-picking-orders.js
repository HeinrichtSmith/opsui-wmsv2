/**
 * Script to check and fix orders in PICKING status that don't have pick_tasks
 */

const { Pool } = require('pg');
const { generatePickTaskId } = require('../shared/dist/utils/generators');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function checkAndFixPickingOrders() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('=== Checking Orders in PICKING status ===\n');

    // Get all orders in PICKING status
    const ordersResult = await client.query(`
      SELECT order_id, customer_name, picker_id, status
      FROM orders
      WHERE status = 'PICKING'
      ORDER BY created_at DESC
    `);

    console.log(`Found ${ordersResult.rows.length} orders in PICKING status:\n`);

    for (const order of ordersResult.rows) {
      const orderId = order.order_id;

      // Check if order has pick_tasks
      const pickTasksResult = await client.query(
        'SELECT COUNT(*) as count FROM pick_tasks WHERE order_id = $1',
        [orderId]
      );
      const pickTasksCount = parseInt(pickTasksResult.rows[0].count, 10);

      // Check if order has order_items
      const orderItemsResult = await client.query(
        'SELECT COUNT(*) as count FROM order_items WHERE order_id = $1',
        [orderId]
      );
      const orderItemsCount = parseInt(orderItemsResult.rows[0].count, 10);

      console.log(`Order: ${orderId}`);
      console.log(`  Customer: ${order.customer_name}`);
      console.log(`  Picker: ${order.picker_id || 'None'}`);
      console.log(`  Order Items: ${orderItemsCount}`);
      console.log(`  Pick Tasks: ${pickTasksCount}`);

      if (orderItemsCount > 0 && pickTasksCount === 0) {
        console.log(`  ⚠️  ISSUE: Order has ${orderItemsCount} order_items but 0 pick_tasks`);
        console.log(`  → Need to generate pick_tasks from order_items\n`);

        // Get order items
        const itemsResult = await client.query('SELECT * FROM order_items WHERE order_id = $1', [
          orderId,
        ]);

        // Generate pick tasks for each order item
        for (const item of itemsResult.rows) {
          const pickTaskId = generatePickTaskId();
          await client.query(
            `INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'PENDING')`,
            [
              pickTaskId,
              orderId,
              item.order_item_id,
              item.sku,
              item.name,
              item.bin_location,
              item.quantity,
            ]
          );
          console.log(`    Created pick_task: ${pickTaskId} for ${item.sku}`);
        }
        console.log(`  ✓ Generated ${itemsResult.rows.length} pick_tasks for order ${orderId}\n`);
      } else if (orderItemsCount === 0 && pickTasksCount === 0) {
        console.log(`  ⚠️  ISSUE: Order has no items at all!\n`);
      } else {
        console.log(`  ✓ Order is correctly set up with ${pickTasksCount} pick_tasks\n`);
      }
    }

    await client.query('COMMIT');
    console.log('=== Check complete ===');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndFixPickingOrders();
