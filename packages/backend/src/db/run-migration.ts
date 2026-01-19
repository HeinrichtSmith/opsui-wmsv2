/**
 * Run the add_active_role migration
 */

import { query, closePool } from './client';

async function runMigration() {
  try {
    console.log('Running add_active_role migration...');

    // Execute migration - add active_role column
    await query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role user_role`
    );

    console.log('Migration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
