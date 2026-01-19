/**
 * Test the getPickerOrders query
 */

import { query, closePool } from './client';

async function testPickerOrdersQuery(): Promise<void> {
  try {
    const pickerId = 'USR-PICK01';
    console.log(`🔍 Testing getPickerOrders query for: ${pickerId}\n`);

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

    console.log(`📦 Found ${result.rows.length} orders:`);
    console.table(result.rows.map(row => ({
      orderId: row.order_id,
      status: row.status,
      progress: row.progress,
      customerName: row.customer_name,
      priority: row.priority,
      itemCount: row.item_count,
    })));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

testPickerOrdersQuery()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
