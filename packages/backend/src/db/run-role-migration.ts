/**
 * Run user role assignments migration
 */

import fs from 'fs';
import path from 'path';
import { getPool } from './client';

async function runMigration() {
  const pool = getPool();

  try {
    const migrationPath = path.join(__dirname, 'migrations', 'add_user_role_assignments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Running user role assignments migration...');

    await pool.query(migrationSQL);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
