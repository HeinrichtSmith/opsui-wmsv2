/**
 * Debug aggregate query
 */

import { query, closePool } from './client';

async function debugAggregate(): Promise<void> {
  try {
    console.log('🔍 Debugging aggregate query...\n');

    const result = await query(
      `
      SELECT
        o.order_id,
        o.status,
        COALESCE(SUM(pt.quantity), 0) as item_count
      FROM orders o
      LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
      WHERE o.picker_id = $1
      GROUP BY o.order_id, o.status
      LIMIT 1
    `,
      ['USR-PICK01']
    );

    console.log('Raw result:', result.rows[0]);
    console.log('\nKeys:', Object.keys(result.rows[0]));
    console.log('\nValues:', Object.values(result.rows[0]));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

debugAggregate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
