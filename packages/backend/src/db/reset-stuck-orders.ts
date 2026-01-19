/**
 * Reset stuck orders script
 *
 * This script resets orders that are stuck in PICKING status
 * back to PENDING status so they can be claimed again
 */

import { query } from './client';
import { logger } from '../config/logger';

async function resetStuckOrder(orderId: string) {
  try {
    logger.info('Resetting stuck order', { orderId });

    // Check current order status
    const orderResult = await query(
      'SELECT order_id, status, picker_id, claimed_at FROM orders WHERE order_id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      logger.error('Order not found', { orderId });
      console.log('❌ Order ' + orderId + ' not found');
      return false;
    }

    const order = orderResult.rows[0];

    console.log('\nOrder: ' + order.order_id);
    console.log('Status: ' + order.status);
    console.log('Picker: ' + (order.picker_id || 'None'));
    console.log('Claimed at: ' + (order.claimed_at || 'Never'));

    if (order.status !== 'PICKING') {
      console.log('\n⚠️  Order is not in PICKING status (it is ' + order.status + ')');
      console.log('No reset needed.');
      return false;
    }

    // Confirm before proceeding
    console.log('\n🔄 This will:');
    console.log('  - Reset order status to PENDING');
    console.log('  - Remove picker assignment');
    console.log('  - Delete all pick tasks');
    console.log('\nProceed? (y/N)');

    // Continue automatically for non-interactive use
    const proceed = process.argv.includes('--force');

    if (!proceed) {
      console.log('\nSkipping... use --force flag to reset automatically');
      return false;
    }

    // Reset order
    await query('BEGIN');

    await query(
      'UPDATE orders SET status = \'PENDING\', picker_id = NULL, claimed_at = NULL WHERE order_id = $1',
      [orderId]
    );

    const pickTasksResult = await query(
      'DELETE FROM pick_tasks WHERE order_id = $1 RETURNING *',
      [orderId]
    );

    await query('COMMIT');

    console.log('\n✅ Order ' + orderId + ' successfully reset');
    console.log('   Deleted ' + pickTasksResult.rows.length + ' pick tasks');

    logger.info('Order reset', { orderId, pickTasksDeleted: pickTasksResult.rows.length });

    return true;
  } catch (error: any) {
    logger.error('Failed to reset order', { orderId, error: error.message });
    console.log('\n❌ Error: ' + error.message);
    await query('ROLLBACK');
    return false;
  }
}

async function listStuckOrders() {
  try {
    console.log('\n📋 Listing orders stuck in PICKING status:\n');

    const result = await query(
      'SELECT o.order_id, o.customer_name, o.status, o.picker_id, o.claimed_at, COUNT(pt.pick_task_id) as pick_tasks ' +
      'FROM orders o ' +
      'LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id ' +
      'WHERE o.status = \'PICKING\' ' +
      'GROUP BY o.order_id, o.customer_name, o.status, o.picker_id, o.claimed_at ' +
      'ORDER BY o.claimed_at DESC'
    );

    if (result.rows.length === 0) {
      console.log('No orders stuck in PICKING status');
      return;
    }

    result.rows.forEach((order: any, index: number) => {
      console.log((index + 1) + '. Order: ' + order.order_id);
      console.log('   Customer: ' + order.customer_name);
      console.log('   Picker: ' + (order.picker_id || 'None'));
      console.log('   Claimed: ' + (order.claimed_at || 'Never'));
      console.log('   Pick Tasks: ' + order.pick_tasks);
      console.log('');
    });

    console.log('Total: ' + result.rows.length + ' order(s) stuck');
  } catch (error: any) {
    logger.error('Failed to list stuck orders', { error: error.message });
    console.log('\n❌ Error: ' + error.message);
  }
}

async function main() {
  console.log('🔧 WMS - Reset Stuck Orders Utility');
  console.log('====================================\n');

  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--list')) {
    await listStuckOrders();
  } else {
    const orderId = args[0];
    await resetStuckOrder(orderId);
  }

  console.log('\nDone!');
  process.exit(0);
}

main().catch((error) => {
  logger.error('Script failed', { error });
  console.error('Script failed:', error);
  process.exit(1);
});