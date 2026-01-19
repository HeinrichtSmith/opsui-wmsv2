const { Pool } = require('pg');

async function resetStuckOrders() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    console.log('Resetting stuck IN_PROGRESS orders back to PENDING...\n');

    // Find orders that are PICKING but have no pick_tasks
    const stuckOrders = await pool.query(`
      SELECT o.order_id, o.status
      FROM orders o
      LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
      WHERE o.status = 'PICKING'
      GROUP BY o.order_id, o.status
      HAVING COUNT(pt.pick_task_id) = 0
    `);

    console.log(`Found ${stuckOrders.rows.length} stuck orders with no pick tasks`);

    if (stuckOrders.rows.length === 0) {
      console.log('No stuck orders found!');
      return;
    }

    // Reset them to PENDING
    const result = await pool.query(`
      UPDATE orders
      SET status = 'PENDING',
          picker_id = NULL,
          claimed_at = NULL
      WHERE order_id = ANY($1)
      RETURNING order_id
    `, [stuckOrders.rows.map(o => o.order_id)]);

    console.log(`\nReset ${result.rows.length} orders to PENDING:`);
    result.rows.forEach(order => {
      console.log(`  - ${order.order_id}`);
    });

    console.log('\nThese orders can now be claimed again with fresh pick tasks!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetStuckOrders();