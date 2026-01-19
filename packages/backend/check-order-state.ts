/**
 * Utility script to check order state for debugging
 */

import { query } from './src/db/client';
import { logger } from './src/config/logger';

async function checkOrderState(orderId: string) {
  try {
    // Get order details
    const orderResult = await query(
      `SELECT order_id, status, picker_id, created_at, claimed_at 
       FROM orders 
       WHERE order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      console.log(`❌ Order ${orderId} not found`);
      return;
    }

    const order = orderResult.rows[0];
    console.log('\n📦 Order Status:');
    console.log(`  Order ID: ${order.order_id}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Picker ID: ${order.picker_id || 'None'}`);
    console.log(`  Claimed At: ${order.claimed_at || 'Not claimed'}`);
    console.log(`  Created At: ${order.created_at}`);

    // Check picker's active orders
    if (order.picker_id) {
      const activeOrdersResult = await query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE picker_id = $1 AND status = 'PICKING'`,
        [order.picker_id]
      );
      const activeCount = parseInt(activeOrdersResult.rows[0].count, 10);
      console.log(`\n👷 Picker's Active Orders: ${activeCount} (max: 5)`);
    }

    // Check if order can be claimed
    const canClaim = order.status === 'PENDING' && !order.picker_id;
    console.log(`\n✅ Can Be Claimed: ${canClaim ? 'YES' : 'NO'}`);

    if (!canClaim) {
      console.log('\n🔒 Claim Blockers:');
      if (order.status !== 'PENDING') {
        console.log(`  - Order is in ${order.status} status (needs to be PENDING)`);
      }
      if (order.picker_id) {
        console.log(`  - Already claimed by ${order.picker_id}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking order:', error);
    process.exit(1);
  }
}

// Get order ID from command line
const orderId = process.argv[2];

if (!orderId) {
  console.log('Usage: ts-node check-order-state.ts <order-id>');
  console.log('Example: ts-node check-order-state.ts ORD-20260112-7802');
  process.exit(1);
}

checkOrderState(orderId);