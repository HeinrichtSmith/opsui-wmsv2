/**
 * Database connectivity check
 *
 * Quick check to verify PostgreSQL is running and accessible
 */

import { getPool } from './client';
import { logger } from '../config/logger';

async function main(): Promise<void> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();

    console.log('✅ Database is accessible');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
