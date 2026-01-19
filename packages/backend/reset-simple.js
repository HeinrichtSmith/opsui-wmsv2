const { Pool } = require('pg');

async function resetSimple() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    console.log('Simple reset - no trigger manipulation...\n');

    // 1. Delete all pick tasks
    console.log('1. Deleting all pick tasks...');
    const pickTasksResult = await pool.query('DELETE FROM pick_tasks RETURNING pick_task_id');
    console.log(`   ✓ Deleted ${pickTasksResult.rows.length} pick tasks`);

    // 2. Reset all order_items.picked_quantity to 0
    console.log('2. Resetting picked_quantity to 0 for all items...');
    const orderItemsResult = await pool.query(`
      UPDATE order_items
      SET picked_quantity = 0
      RETURNING order_item_id
    `);
    console.log(`   ✓ Reset ${orderItemsResult.rows.length} order_items`);

    // 3. Reset all orders to PENDING (this will update all 20 at once)
    console.log('3. Resetting all orders to PENDING...');
    const ordersResult = await pool.query(`
      UPDATE orders
      SET status = 'PENDING',
          picker_id = NULL,
          claimed_at = NULL
      WHERE status != 'PENDING'
      RETURNING order_id
    `);
    console.log(`   ✓ Reset ${ordersResult.rows.length} orders to PENDING`);

    // 4. Show summary
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_orders
      FROM orders
    `);
    const summary = summaryResult.rows[0];
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total orders: ${summary.total_orders}`);
    console.log(`Pending orders: ${summary.pending_orders}`);
    console.log('\n✓ Simple reset complete!');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetSimple();
