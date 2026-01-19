/**
 * Check if sales tables exist
 */

import { query, closePool } from './client';

async function checkTables() {
  try {
    console.log('Checking for sales tables...');

    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('customers', 'leads', 'opportunities', 'quotes', 'quote_line_items', 'customer_interactions')
    `);

    console.log(`Found ${result.rows.length} sales tables:`);
    result.rows.forEach((row: any) => console.log('  -', row.table_name || row));

    if (result.rows.length === 0) {
      console.log('\nNo sales tables found. Please run the add-on modules migration.');
    } else {
      console.log('\nSales module database schema is ready!');
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Error checking tables:', error);
    await closePool();
    process.exit(1);
  }
}

checkTables();
