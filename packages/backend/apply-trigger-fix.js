/**
 * Apply order_items status trigger fix
 * This script executes the SQL migration to fix the enum casting issue
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log('🔧 Applying order_items status trigger fix...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'fix-order-item-status-trigger.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');
    console.log('Changes made:');
    console.log('  - Dropped old trigger and function');
    console.log('  - Recreated update_order_progress() function with explicit enum casting');
    console.log('  - Recreated trigger_update_order_progress trigger\n');
    console.log('The database trigger will now correctly handle order_item_status enum values.');

    // Verify the fix
    const result = await client.query(`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_name = 'update_order_progress'
        AND routine_schema = 'public'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Trigger function verified in database');
    } else {
      console.log('⚠️  Warning: Could not verify function in database');
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('\n✨ Fix completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });
