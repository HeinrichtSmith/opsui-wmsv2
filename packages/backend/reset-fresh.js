const { Pool } = require('pg');

async function resetFreshData() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    console.log('Resetting to fresh data...\n');

    // 1. Disable trigger first (before any updates)
    console.log('1. Disabling order_state_changes trigger...');
    await pool.query('DROP TRIGGER IF EXISTS order_state_changes ON orders');
    console.log('   ✓ Trigger disabled');

    // 2. Clear order_state_changes table
    console.log('2. Clearing order_state_changes table...');
    const changesResult = await pool.query('DELETE FROM order_state_changes RETURNING change_id');
    console.log(`   ✓ Deleted ${changesResult.rows.length} state change entries`);

    // 3. Reset all orders to PENDING
    const ordersResult = await pool.query(`
      UPDATE orders
      SET status = 'PENDING',
          picker_id = NULL,
          claimed_at = NULL
      RETURNING order_id
    `);
    console.log(`3. Reset ${ordersResult.rows.length} orders to PENDING`);

    // 4. Delete all pick tasks
    const pickTasksResult = await pool.query(`
      DELETE FROM pick_tasks
      RETURNING pick_task_id
    `);
    console.log(`4. Deleted ${pickTasksResult.rows.length} pick tasks`);

    // 5. Reset all order_items.picked_quantity to 0
    const orderItemsResult = await pool.query(`
      UPDATE order_items
      SET picked_quantity = 0
      RETURNING order_item_id
    `);
    console.log(`5. Reset picked_quantity for ${orderItemsResult.rows.length} order_items`);

    // 6. Show summary
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
    console.log('\n✓ Database reset to fresh state!');
    console.log('\nNote: trigger will be recreated on next order claim');

  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetFreshData();