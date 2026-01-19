/**
 * Fix progress rounding to match JavaScript Math.round() behavior
 *
 * Updates all order progress values using round-half-up instead of banker's rounding
 */

import { query, closePool } from './client';

async function fixProgressRounding(): Promise<void> {
  try {
    console.log('🔧 Fixing progress rounding for all orders...\n');

    const result = await query(`
      WITH new_progress AS (
        SELECT
          o.order_id,
          FLOOR(
            (CAST(COUNT(*) FILTER (WHERE pt.status = 'COMPLETED') AS NUMERIC) /
             NULLIF(COUNT(*), 0)) * 100 + 0.5
          ) as new_progress
        FROM orders o
        LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
        GROUP BY o.order_id
      )
      UPDATE orders
      SET progress = np.new_progress
      FROM new_progress np
      WHERE orders.order_id = np.order_id
      RETURNING orders.order_id, orders.progress
    `);

    console.log(`✅ Updated ${result.rows.length} orders`);
    console.log('\n📊 Sample of updated orders:');
    console.table(result.rows.slice(0, 10).map((row: any) => ({
      orderId: row.order_id,
      newProgress: row.progress,
    })));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

fixProgressRounding()
  .then(() => {
    console.log('\n✅ Progress rounding fix completed!');
    process.exit(0);
  })
  .catch(() => process.exit(1));
