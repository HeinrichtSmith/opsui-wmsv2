/**
 * Check progress discrepancy for order ORD-20260114-5920
 */

import { query, closePool } from './client';

async function checkProgress(): Promise<void> {
  try {
    const orderId = 'ORD-20260114-5920';
    console.log(`🔍 Checking progress for order: ${orderId}\n`);

    // Get order progress from database
    const orderResult = await query(`
      SELECT order_id, progress, status, picker_id
      FROM orders
      WHERE order_id = $1
    `, [orderId]);

    console.log('📦 Order from database:');
    console.log('  Order ID:', orderResult.rows[0].order_id);
    console.log('  Progress:', orderResult.rows[0].progress);
    console.log('  Status:', orderResult.rows[0].status);
    console.log('  Picker ID:', orderResult.rows[0].picker_id);

    // Calculate progress manually from pick_tasks
    const tasksResult = await query(`
      SELECT
        pick_task_id,
        status,
        quantity,
        picked_quantity
      FROM pick_tasks
      WHERE order_id = $1
      ORDER BY pick_task_id
    `, [orderId]);

    console.log('\n📋 Pick tasks:');
    console.table(tasksResult.rows);

    // Manual calculation
    const totalTasks = tasksResult.rows.length;
    const completedTasks = tasksResult.rows.filter(t => t.status === 'COMPLETED').length;
    const calculatedProgress = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    console.log('\n🧮 Manual calculation:');
    console.log('  Total tasks:', totalTasks);
    console.log('  Completed tasks:', completedTasks);
    console.log('  Calculated progress:', calculatedProgress + '%');

    console.log('\n📊 Database calculation:');
    const dbCalcResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        ROUND(
          CAST(COUNT(*) FILTER (WHERE status = 'COMPLETED') AS FLOAT) /
          NULLIF(COUNT(*), 0) * 100
        ) as progress
      FROM pick_tasks
      WHERE order_id = $1
    `, [orderId]);

    console.log('  Total tasks:', dbCalcResult.rows[0].total);
    console.log('  Completed tasks:', dbCalcResult.rows[0].completed);
    console.log('  Calculated progress:', dbCalcResult.rows[0].progress);

    // Check order_items progress as well
    const itemsResult = await query(`
      SELECT
        order_item_id,
        status,
        quantity,
        picked_quantity
      FROM order_items
      WHERE order_id = $1
      ORDER BY order_item_id
    `, [orderId]);

    console.log('\n📦 Order items:');
    console.table(itemsResult.rows);

    const totalItems = itemsResult.rows.length;
    const completedItems = itemsResult.rows.filter(t => t.status === 'FULLY_PICKED').length;
    const itemsProgress = totalItems > 0
      ? Math.round((completedItems / totalItems) * 100)
      : 0;

    console.log('\n🧮 Order items calculation:');
    console.log('  Total items:', totalItems);
    console.log('  Fully picked items:', completedItems);
    console.log('  Items progress:', itemsProgress + '%');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

checkProgress()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
