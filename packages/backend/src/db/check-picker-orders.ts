/**
 * Debug script to check picker orders
 */

import { query, closePool } from './client';

async function checkPickerOrders(): Promise<void> {
  try {
    console.log('🔍 Checking picker orders...\n');

    // Check all orders with their picker_id and status
    const orders = await query(`
      SELECT
        order_id,
        customer_name,
        status,
        picker_id,
        progress,
        priority,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('📦 Recent orders:');
    console.table(orders.rows);

    // Check specific picker
    const pickerId = 'USR-PICK01';
    console.log(`\n🔍 Checking orders for picker: ${pickerId}`);

    const pickerOrders = await query(`
      SELECT
        order_id,
        customer_name,
        status,
        picker_id,
        progress,
        priority
      FROM orders
      WHERE picker_id = $1
      ORDER BY updated_at DESC
    `, [pickerId]);

    console.log(`\n📦 Orders for ${pickerId}:`);
    if (pickerOrders.rows.length === 0) {
      console.log('  No orders found with picker_id =', pickerId);
    } else {
      console.table(pickerOrders.rows);
    }

    // Check orders in PICKING status
    const pickingOrders = await query(`
      SELECT
        order_id,
        customer_name,
        picker_id,
        status
      FROM orders
      WHERE status = 'PICKING'
    `);

    console.log(`\n📦 Orders with status = 'PICKING':`);
    if (pickingOrders.rows.length === 0) {
      console.log('  No orders found with status = PICKING');
    } else {
      console.table(pickingOrders.rows);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

checkPickerOrders()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
