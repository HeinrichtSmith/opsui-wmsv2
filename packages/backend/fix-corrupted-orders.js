const { Pool } = require('pg');

async function fixCorruptedOrders() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    console.log('Fixing corrupted order data...\n');

    // Reset picked_quantity in order_items for skipped items
    const orderItemsResult = await pool.query(`
      UPDATE order_items oi
      SET picked_quantity = 0
      FROM pick_tasks pt
      WHERE oi.order_item_id = pt.order_item_id
        AND pt.status = 'SKIPPED'
        AND oi.picked_quantity > 0
      RETURNING oi.order_item_id, oi.picked_quantity
    `);
    
    console.log(`✓ Fixed ${orderItemsResult.rows.length} order_items with corrupted picked_quantity`);

    // Reset picked_quantity in pick_tasks for skipped items
    const pickTasksResult = await pool.query(`
      UPDATE pick_tasks
      SET picked_quantity = 0
      WHERE status = 'SKIPPED'
        AND picked_quantity > 0
      RETURNING pick_task_id, picked_quantity
    `);
    
    console.log(`✓ Fixed ${pickTasksResult.rows.length} pick_tasks with corrupted picked_quantity`);

    // Count total skipped items
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_skipped
      FROM pick_tasks
      WHERE status = 'SKIPPED'
    `);
    
    console.log(`\nTotal skipped items: ${countResult.rows[0].total_skipped}`);
    console.log('\n✓ Database fix completed successfully!');

  } catch (error) {
    console.error('Error fixing corrupted orders:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixCorruptedOrders();