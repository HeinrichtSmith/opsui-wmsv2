const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'postgres',
  password: 'postgres',
});

async function fixPickingOrders() {
  try {
    console.log('Checking for orders in PICKING status without items...');

    // Find orders in PICKING status with no order_items
    const result = await pool.query(`
      SELECT o.order_id, o.status 
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.status = 'PICKING' 
      GROUP BY o.order_id, o.status
      HAVING COUNT(oi.order_item_id) = 0
    `);

    if (result.rows.length === 0) {
      console.log('✓ No corrupted orders found');
      return;
    }

    console.log(`Found ${result.rows.length} corrupted orders:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.order_id} (${row.status})`);
    });

    // Reset these orders to PENDING status - disable trigger temporarily
    await pool.query('DROP TRIGGER IF EXISTS trigger_log_order_state_change ON orders');

    for (const order of result.rows) {
      await pool.query(
        `
        UPDATE orders 
        SET status = 'PENDING', 
            picker_id = NULL,
            claimed_at = NULL
        WHERE order_id = $1
      `,
        [order.order_id]
      );
      console.log(`✓ Reset ${order.order_id} to PENDING`);
    }

    // Re-enable the trigger
    await pool.query(`
      CREATE TRIGGER trigger_log_order_state_change
      AFTER UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION log_order_state_change()
    `);

    console.log('✓ All corrupted orders fixed!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPickingOrders();
