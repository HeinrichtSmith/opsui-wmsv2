/**
 * Run test picker data SQL
 * This script adds test pickers and orders to the database
 * for testing picker activity tracking
 */

import { query } from './src/db/client';
import { logger } from './src/config/logger';
import fs from 'fs';
import path from 'path';

async function runTestPickers() {
  try {
    logger.info('Loading test picker SQL...');

    const sqlPath = path.join(__dirname, 'add-test-pickers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    logger.info(`Executing SQL from ${sqlPath} (${sql.length} bytes)...`);

    await query(sql);

    logger.info('✅ Test picker data loaded successfully!');
    logger.info('');
    logger.info('Test data includes:');
    logger.info('  - 4 picker users (John, Jane, Mike, Sarah)');
    logger.info('  - 5 test orders with different states:');
    logger.info('    * ORD-TEST01: Being picked by John (ACTIVE)');
    logger.info('    * ORD-TEST02: Pending (no picker)');
    logger.info('    * ORD-TEST03: Recently picked by Jane (IDLE)');
    logger.info('    * ORD-TEST04: Being picked by Mike (ACTIVE)');
    logger.info('    * ORD-TEST05: Picked by Sarah 2h ago (IDLE)');
    logger.info('');
    logger.info('Test the picker activity endpoint to verify tracking works correctly.');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error loading test picker data:', error);
    process.exit(1);
  }
}

runTestPickers();
