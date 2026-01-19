/**
 * Check and apply current_view columns migration
 *
 * This script checks if the current_view and current_view_updated_at columns
 * exist in the users table and applies the migration if they don't.
 */

import { query, closePool } from './client';
import { logger } from '../config/logger';

async function checkAndApplyMigration(): Promise<void> {
  try {
    console.log('🔍 Checking if current_view columns exist in users table...\n');

    // Check if columns exist
    const checkResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('current_view', 'current_view_updated_at')
      ORDER BY column_name;
    `);

    const existingColumns = checkResult.rows.map((row: any) => row.columnName);

    console.log(`Found ${existingColumns.length} columns: ${existingColumns.join(', ') || 'none'}`);

    const requiredColumns = ['current_view', 'current_view_updated_at'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log('\n✅ All required columns exist. No migration needed.\n');

      // Show current state
      const sampleData = await query(`
        SELECT
          user_id,
          name,
          role,
          current_view,
          current_view_updated_at,
          NOW() as server_time
        FROM users
        WHERE role = 'PICKER'
        LIMIT 3;
      `);

      if (sampleData.rows.length > 0) {
        console.log('📊 Current picker data:');
        console.table(sampleData.rows);
      } else {
        console.log('⚠️  No picker accounts found in database.');
      }

      return;
    }

    console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
    console.log('🔧 Applying migration...\n');

    // Apply the migration
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS current_view VARCHAR(100),
      ADD COLUMN IF NOT EXISTS current_view_updated_at TIMESTAMP WITH TIME ZONE;
    `);

    console.log('✅ Columns added successfully');

    // Create index for better query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_current_view
      ON users(current_view)
      WHERE current_view IS NOT NULL;
    `);

    console.log('✅ Index created successfully');

    // Add comments
    await query(`
      COMMENT ON COLUMN users.current_view IS 'Current page/view the user is on (e.g., "Orders Page", "Order Queue", "Order ORD-123")';
      COMMENT ON COLUMN users.current_view_updated_at IS 'Timestamp when current_view was last updated';
    `);

    console.log('✅ Comments added successfully\n');

    // Verify the migration
    const verifyResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('current_view', 'current_view_updated_at')
      ORDER BY column_name;
    `);

    console.log('🔍 Verification - Columns now exist:');
    console.table(verifyResult.rows);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the backend server');
    console.log('   2. Login as a picker and navigate to Order Queue');
    console.log('   3. Check admin dashboard to see real-time activity');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  checkAndApplyMigration()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { checkAndApplyMigration };
