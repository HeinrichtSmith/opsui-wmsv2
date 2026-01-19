/**
 * Fix state change ID generation to be more unique
 *
 * This script updates the generate_state_change_id() function to use
 * millisecond precision + random component to avoid duplicate key errors
 * when multiple orders are updated in quick succession.
 */

import { query, closePool } from './client';

async function fixStateChangeIdGeneration(): Promise<void> {
  try {
    console.log('🔧 Fixing state change ID generation...\n');

    // Drop the old function and create a new one with microsecond precision + random component
    await query(`
      CREATE OR REPLACE FUNCTION generate_state_change_id()
      RETURNS VARCHAR(50) AS $$
        SELECT 'OSC-' ||
               TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
               LPAD(FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT, 11, '0') || '-' ||
               LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      $$ LANGUAGE SQL;
    `);

    console.log('✅ Successfully updated generate_state_change_id() function');
    console.log('   New format: OSC-YYYYMMDD-milliseconds-4digit-random');
    console.log('   Example: OSC-20260115-1734567890-1234\n');

    // Test the new function
    const result = await query(`SELECT generate_state_change_id() as test_id`);
    console.log('🧪 Test ID:', result.rows[0].testId);
  } catch (error) {
    console.error('❌ Failed to fix state change ID generation:', error);
    throw error;
  } finally {
    await closePool();
  }
}

fixStateChangeIdGeneration()
  .then(() => {
    console.log('\n✅ State change ID generation fix completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });
