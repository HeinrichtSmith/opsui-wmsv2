/**
 * Fix order that's in PICKING status but has no picker_id
 * This happens when an order is manually set to PICKING or there was a partial state transition
 */

const { Client } = require('pg');

async function fixOrder() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const orderId = 'ORD-20260114-0001';
    const pickerId = 'USR-PICK01';

    // Check current order state
    const orderResult = await client.query(
      `SELECT order_id, status, picker_id, claimed_at FROM orders WHERE order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      console.log('Order not found');
      return;
    }

    const order = orderResult.rows[0];
    console.log('Current order state:', order);

    if (order.status === 'PICKING' && !order.picker_id) {
      // Fix: Set picker_id for order in PICKING status without picker
      await client.query(
        `UPDATE orders 
         SET picker_id = $1, 
             claimed_at = COALESCE(claimed_at, NOW()),
             updated_at = NOW()
         WHERE order_id = $2`,
        [pickerId, orderId]
      );
      console.log(`✓ Fixed order ${orderId}: Assigned picker ${pickerId}`);
    } else {
      console.log('Order does not need fixing');
    }

    // Verify the fix
    const verifyResult = await client.query(
      `SELECT order_id, status, picker_id, claimed_at FROM orders WHERE order_id = $1`,
      [orderId]
    );
    console.log('Updated order state:', verifyResult.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixOrder();