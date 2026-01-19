/**
 * Check timestamp behavior
 */

import { query, closePool } from './client';

async function checkTimestamps(): Promise<void> {
  try {
    console.log('🕐 Checking timestamp behavior\n');

    // Check NOW() vs timezone
    const result = await query(`
      SELECT
        NOW() as server_now,
        NOW() AT TIME ZONE 'UTC' as utc_now,
        CURRENT_TIMESTAMP as current_timestamp,
        transaction_timestamp() as transaction_timestamp,
        statement_timestamp() as statement_timestamp
    `);

    console.log('📊 Server timestamps:');
    console.table(result.rows);

    // Test the UPDATE query that AuthService uses
    console.log('\n📝 Testing UPDATE query with NOW()...');
    await query(`
      UPDATE users
      SET current_view = 'TIMESTAMP-TEST',
          current_view_updated_at = NOW()
      WHERE user_id = 'USR-PICK01'
    `);

    const checkResult = await query(`
      SELECT
        current_view,
        current_view_updated_at,
        NOW() as server_now,
        EXTRACT(EPOCH FROM (NOW() - current_view_updated_at)) as seconds_ago
      FROM users
      WHERE user_id = 'USR-PICK01'
    `);

    console.log('\n📊 After UPDATE:');
    console.table(checkResult.rows);

    const row = checkResult.rows[0] as any;

    // Check if there's a timezone issue
    const serverTime = new Date(row.serverNow);
    const updatedTime = new Date(row.currentViewUpdatedAt);
    const timeDiff = Math.abs(serverTime.getTime() - updatedTime.getTime()) / 1000;

    console.log('\n📊 Time analysis:');
    console.log(`   Server time: ${serverTime.toISOString()}`);
    console.log(`   Updated at: ${updatedTime.toISOString()}`);
    console.log(`   Difference: ${timeDiff.toFixed(3)} seconds`);

    if (timeDiff > 10) {
      console.log('\n⚠️  WARNING: Large time difference detected!');
      console.log('   This may indicate a timezone configuration issue.');
    } else {
      console.log('\n✅ Timestamps are in sync.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePool();
  }
}

checkTimestamps()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
