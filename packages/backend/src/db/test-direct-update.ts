/**
 * Test direct database update of current_view
 *
 * This bypasses the API and directly updates the database to verify
 * that the issue is in the API/frontend layer, not the database.
 */

import { query, closePool } from './client';

async function testDirectUpdate(): Promise<void> {
  try {
    console.log('🧪 Testing direct database update of current_view\n');

    // Get current state
    console.log('📝 Before update:');
    const beforeResult = await query(`
      SELECT
        user_id,
        name,
        current_view,
        current_view_updated_at,
        NOW() as server_time
      FROM users
      WHERE user_id = 'USR-PICK01'
    `);

    console.table(beforeResult.rows);

    // Update directly
    console.log('\n📝 Updating current_view directly...');
    await query(`
      UPDATE users
      SET current_view = 'DIRECT-UPDATE-TEST',
          current_view_updated_at = NOW()
      WHERE user_id = 'USR-PICK01'
    `);

    console.log('✅ Update successful');

    // Verify update
    console.log('\n📝 After update:');
    const afterResult = await query(`
      SELECT
        user_id,
        name,
        current_view,
        current_view_updated_at,
        NOW() as server_time,
        EXTRACT(EPOCH FROM (NOW() - current_view_updated_at)) as seconds_ago
      FROM users
      WHERE user_id = 'USR-PICK01'
    `);

    console.table(afterResult.rows);

    const row = afterResult.rows[0] as any;
    const secondsAgo = Math.round(row.secondsAgo);

    if (secondsAgo < 2) {
      console.log('\n✅ SUCCESS! Direct database update works correctly.');
      console.log('   This confirms the database columns are functional.');
      console.log('\n❗ The issue is that the API endpoint is not being called by the frontend');
      console.log('   or the API endpoint is failing silently.\n');
    } else {
      console.log(`\n⚠️  Update is ${secondsAgo}s old, which is unexpected.\n`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

testDirectUpdate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
