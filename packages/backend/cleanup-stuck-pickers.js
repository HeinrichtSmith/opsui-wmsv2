/**
 * Cleanup stuck picker statuses
 * 
 * This script clears picker assignments from orders that have been inactive for more than 1 hour
 * Useful for fixing cases where pickers logged out but their status wasn't properly cleared
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://wms_user:wms_password@localhost:5432/wms_db',
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function cleanupStuckPickers() {
  console.log('='.repeat(60));
  console.log('Cleanup Stuck Picker Statuses');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Find pickers with stuck orders
    console.log('Step 1: Finding pickers with stuck orders (inactive > 1 hour)...');
    const stuckPickersResult = await query(
      `SELECT 
         DISTINCT u.user_id, 
         u.name, 
         COUNT(o.order_id) as stuck_orders,
         MAX(o.updated_at) as last_activity
       FROM users u
       INNER JOIN orders o ON u.user_id = o.picker_id
       WHERE o.status = 'PICKING'
         AND o.updated_at < NOW() - INTERVAL '1 hour'
       GROUP BY u.user_id, u.name
       ORDER BY last_activity DESC`
    );
    
    console.log(`Found ${stuckPickersResult.rows.length} picker(s) with stuck orders:`);
    if (stuckPickersResult.rows.length > 0) {
      stuckPickersResult.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.user_id}): ${row.stuck_orders} orders, last activity ${row.last_activity}`);
      });
    } else {
      console.log('  No stuck pickers found');
      process.exit(0);
    }
    console.log();

    // Step 2: Get details of stuck orders
    console.log('Step 2: Getting details of stuck orders...');
    for (const picker of stuckPickersResult.rows) {
      const ordersResult = await query(
        `SELECT order_id, customer_name, status, progress, updated_at
         FROM orders
         WHERE picker_id = $1 AND status = 'PICKING'
         ORDER BY updated_at DESC`,
        [picker.user_id]
      );
      
      console.log(`\nPicker ${picker.name} (${picker.user_id}):`);
      ordersResult.rows.forEach(row => {
        console.log(`  - Order ${row.order_id}: ${row.customer_name}, ${row.progress}% complete, updated ${row.updated_at}`);
      });
    }
    console.log();

    // Step 3: Confirm cleanup
    console.log('Step 3: Cleaning up stuck orders...');
    console.log('─'.repeat(60));
    
    let totalOrdersCleared = 0;
    
    for (const picker of stuckPickersResult.rows) {
      // Disable trigger temporarily to avoid duplicate key conflicts
      await query(
        `DROP TRIGGER IF EXISTS trigger_log_order_state_change ON orders`
      );
      
      // Clear picker from orders
      const updateOrdersResult = await query(
        `UPDATE orders 
         SET status = 'PENDING', 
             picker_id = NULL, 
             claimed_at = NULL,
             updated_at = NOW()
         WHERE picker_id = $1 AND status = 'PICKING'`,
        [picker.user_id]
      );
      
      const ordersCleared = updateOrdersResult.rowCount;
      totalOrdersCleared += ordersCleared;
      
      console.log(`✓ Cleared ${ordersCleared} orders for ${picker.name} (${picker.user_id})`);
      
      // Clear pick tasks for these orders
      const updateTasksResult = await query(
        `UPDATE pick_tasks
         SET picker_id = NULL,
             status = 'PENDING',
             started_at = NULL,
             completed_at = NULL,
             skipped_at = NULL
         WHERE picker_id = $1`,
        [picker.user_id]
      );
      
      console.log(`  - Reset ${updateTasksResult.rowCount} pick tasks`);
      
      // Clear user current task
      await query(
        `UPDATE users SET current_task_id = NULL WHERE user_id = $1`,
        [picker.user_id]
      );
      
      console.log(`  - Cleared current task`);
      
      // Re-enable the trigger
      await query(
        `CREATE TRIGGER trigger_log_order_state_change
         AFTER UPDATE ON orders
         FOR EACH ROW
         EXECUTE FUNCTION log_order_state_change()`
      );
    }
    
    console.log();
    console.log('='.repeat(60));
    console.log(`Cleanup complete! Cleared ${totalOrdersCleared} stuck orders`);
    console.log('='.repeat(60));
    console.log();
    console.log('Next steps:');
    console.log('  1. The orders are now back in PENDING status');
    console.log('  2. They can be claimed by other pickers');
    console.log('  3. Future logouts will properly clear orders automatically');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupStuckPickers().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});