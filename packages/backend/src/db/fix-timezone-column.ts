/**
 * Fix timezone issue in current_view_updated_at column
 *
 * The column was created as TIMESTAMP WITHOUT TIME ZONE, which causes
 * issues with timezone conversion. This script converts it to
 * TIMESTAMP WITH TIME ZONE.
 */

import { query, closePool } from './client';

async function fixTimezoneColumn(): Promise<void> {
  try {
    console.log('🔧 Fixing timezone issue in current_view_updated_at column\n');

    // Check current column type
    console.log('📝 Step 1: Checking current column type...');
    const checkResult = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'current_view_updated_at'
    `);

    console.log('Current column info:');
    console.table(checkResult.rows);

    const columnInfo = checkResult.rows[0] as any;

    if (columnInfo.dataType.includes('with time zone')) {
      console.log('\n✅ Column already has correct type (TIMESTAMP WITH TIME ZONE)');
      return;
    }

    if (!columnInfo.dataType.includes('without time zone')) {
      console.log(`\n⚠️  Unexpected column type: ${columnInfo.dataType}`);
      console.log('   Manual intervention may be required.');
      return;
    }

    console.log('\n📝 Step 2: Converting column to TIMESTAMP WITH TIME ZONE...');
    console.log('   This will preserve existing data but add timezone info.\n');

    // First, back up current data
    const backupResult = await query(`
      SELECT
        user_id,
        current_view,
        current_view_updated_at
      FROM users
      WHERE current_view_updated_at IS NOT NULL
    `);

    console.log(`📦 Backed up ${backupResult.rows.length} row(s) of data`);

    // Convert the column type
    // Using ALTER COLUMN with USING clause to convert properly
    await query(`
      ALTER TABLE users
      ALTER COLUMN current_view_updated_at
      TYPE TIMESTAMP WITH TIME ZONE
      USING current_view_updated_at AT TIME ZONE 'America/Los_Angeles' AT TIME ZONE 'UTC'
    `);

    console.log('✅ Column type converted successfully');

    // Verify the conversion
    console.log('\n📝 Step 3: Verifying conversion...');
    const verifyResult = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'current_view_updated_at'
    `);

    console.log('New column type:');
    console.table(verifyResult.rows);

    // Test the update query
    console.log('\n📝 Step 4: Testing update with new column type...');
    await query(`
      UPDATE users
      SET current_view = 'TIMEZONE-FIX-TEST',
          current_view_updated_at = NOW()
      WHERE user_id = 'USR-PICK01'
    `);

    const testResult = await query(`
      SELECT
        current_view,
        current_view_updated_at,
        NOW() as server_now,
        EXTRACT(EPOCH FROM (NOW() - current_view_updated_at)) as seconds_ago
      FROM users
      WHERE user_id = 'USR-PICK01'
    `);

    console.log('Test update result:');
    console.table(testResult.rows);

    const row = testResult.rows[0] as any;
    const secondsAgo = Math.abs(parseFloat(row.secondsAgo));

    if (secondsAgo < 2) {
      console.log('\n✅ SUCCESS! Timezone issue is fixed.');
      console.log('   The timestamp is now correctly stored with timezone info.');
    } else {
      console.log(`\n⚠️  Still seeing ${secondsAgo}s difference`);
      console.log('   Further investigation may be needed.');
    }

  } catch (error) {
    console.error('\n❌ Failed to fix timezone:', error);
    throw error;
  } finally {
    await closePool();
  }
}

fixTimezoneColumn()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
