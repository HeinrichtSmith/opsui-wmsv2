/**
 * Debug query column names
 */

import { query, closePool } from './client';

async function debugQuery(): Promise<void> {
  try {
    console.log('🔍 Debugging query column names...\n');

    const result = await query(`
      SELECT
        o.order_id,
        o.status,
        o.customer_name,
        o.priority
      FROM orders o
      WHERE o.picker_id = $1
      LIMIT 1
    `, ['USR-PICK01']);

    console.log('Raw result:', result.rows[0]);
    console.log('\nKeys:', Object.keys(result.rows[0]));
    console.log('\nValues:', Object.values(result.rows[0]));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await closePool();
  }
}

debugQuery()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
