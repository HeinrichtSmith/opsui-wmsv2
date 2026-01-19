/**
 * Clean all data from database (keep schema)
 *
 * Removes all data but preserves table structure
 */

import { query, closePool } from './client';
import { logger } from '../config/logger';

/**
 * Truncate all tables (removes data, keeps schema)
 */
export async function cleanAllData(): Promise<void> {
  try {
    logger.info('Cleaning all data from database...');

    // Truncate in correct order due to foreign key constraints
    await query(`
      TRUNCATE TABLE
        order_state_changes CASCADE,
        inventory_transactions CASCADE,
        pick_tasks CASCADE,
        order_items CASCADE,
        orders CASCADE,
        inventory_units CASCADE,
        bin_locations CASCADE,
        skus CASCADE,
        users CASCADE
    `);

    logger.info('All data cleaned successfully');
  } catch (error) {
    logger.error('Failed to clean data', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// CLI Entry Point
async function main(): Promise<void> {
  try {
    await cleanAllData();
    await closePool();
    console.log('✅ Data cleaned successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to clean data');
    await closePool();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main as cleanDataCli };
