/**
 * Test complete getPickerOrders query
 */

import { query, closePool } from './client';

async function testCompleteQuery(): Promise<void> {
  try {
    const pickerId = 'USR-PICK01';
    console.log(`🔍 Testing complete getPickerOrders for: ${pickerId}\n`);

    const result = await query(`
      SELECT
        o.order_id,
        o.status,
        COALESCE(o.progress, 0) as progress,
        o.customer_name,
        o.priority,
        COALESCE(SUM(pt.quantity), 0) as item_count
      FROM orders o
      LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
      WHERE o.picker_id = $1
      GROUP BY o.order_id, o.status, o.progress, o.customer_name, o.priority
      ORDER BY
        CASE
          WHEN o.status = 'PICKING' THEN 0
          WHEN o.status = 'PENDING' THEN 1
          WHEN o.status = 'PICKED' THEN 2
          WHEN o.status = 'SHIPPED' THEN 3
          ELSE 4
        END,
        o.updated_at DESC
    `, [pickerId]);

    console.log(`✅ Found ${result.rows.length} orders\n`);
    console.log('Raw first row:', result.rows[0]);
    console.log('Raw first row keys:', Object.keys(result.rows[0]));

    const mapped = result.rows.map((row) => ({
      orderId: row.order_id,
      status: row.status,
      progress: parseInt(row.progress || 0, 10),
      customerName: row.customer_name,
      priority: row.priority,
      itemCount: parseInt(row.item_count || 0, 10),
    }));

    console.log('\nMapped result:', mapped);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

testCompleteQuery()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
