const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'postgres',
  password: 'postgres',
});

async function generatePickTasks() {
  try {
    console.log('Finding orders in PICKING status without pick_tasks...');

    // Find orders in PICKING status with no pick_tasks but have order_items
    const result = await pool.query(`
      SELECT o.order_id
      FROM orders o
      WHERE o.status = 'PICKING'
        AND o.order_id IN (
          SELECT DISTINCT order_id FROM order_items
        )
        AND o.order_id NOT IN (
          SELECT DISTINCT order_id FROM pick_tasks
        )
    `);

    if (result.rows.length === 0) {
      console.log('✓ All PICKING orders have pick_tasks');
      return;
    }

    console.log(`Found ${result.rows.length} PICKING orders without pick_tasks`);

    // Generate pick_tasks for each order
    let totalTasks = 0;
    for (const order of result.rows) {
      console.log(`\n  Generating pick_tasks for ${order.order_id}`);

      // Get order items
      const itemsResult = await pool.query(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY order_item_id',
        [order.order_id]
      );

      for (const item of itemsResult.rows) {
        // Generate pick_task_id (PT + 9 digits = 11 chars max)
        const pickTaskId = 'PT' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);

        await pool.query(
          `
          INSERT INTO pick_tasks (pick_task_id, order_id, order_item_id, sku, name, target_bin, quantity, picked_quantity, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
        `,
          [
            pickTaskId,
            order.order_id,
            item.order_item_id,
            item.sku,
            item.name,
            item.bin_location,
            item.quantity,
            0,
          ]
        );

        console.log(
          `    Created task ${pickTaskId}: ${item.sku} x${item.quantity} at ${item.bin_location}`
        );
        totalTasks++;
      }
    }

    console.log(`\n✓ Generated ${totalTasks} pick_tasks for ${result.rows.length} orders`);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

generatePickTasks();
