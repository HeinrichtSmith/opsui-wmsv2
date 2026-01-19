/**
 * Check users table schema
 */

import { query, closePool } from './client';

async function checkSchema(): Promise<void> {
  try {
    console.log('🔍 Checking users table schema...\n');

    const result = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Users table schema:');
    console.table(result.rows);

    console.log('\n📊 Current picker data:');
    const pickerData = await query(`
      SELECT *
      FROM users
      WHERE role = 'PICKER'
      ORDER BY user_id
      LIMIT 5;
    `);

    console.table(pickerData.rows.map((row: any) => ({
      userId: row.userId,
      email: row.email,
      name: row.name,
      role: row.role,
      active: row.active,
      currentView: row.currentView,
      currentViewUpdatedAt: row.currentViewUpdatedAt
    })));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await closePool();
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
