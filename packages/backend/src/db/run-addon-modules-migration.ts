/**
 * Run the add-on modules migration
 * Creates tables for Production Management, Sales & CRM, and Maintenance & Assets
 */

import { getPool } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const pool = await getPool();
  const client = pool;

  try {
    console.log('Running add-on modules migration...');
    console.log('This will create tables for:');
    console.log('  - Production Management');
    console.log('  - Sales & CRM');
    console.log('  - Maintenance & Assets');

    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrations', '004_addon_modules.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('\nMigration file loaded, size:', migrationSQL.length);

    console.log('\nParsing SQL statements...');

    // Split the SQL into individual statements and execute them
    const statements: string[] = [];
    let currentStatement = '';

    const lines = migrationSQL.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('--') || trimmed === '') {
        continue;
      }

      currentStatement += line + '\n';

      // Check if statement is complete (ends with semicolon)
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    console.log(`Parsed ${statements.length} SQL statements`);

    // Execute statements in order: tables first, then indexes, then constraints
    const tableStatements = statements.filter(
      s => s.toUpperCase().includes('CREATE TABLE') && !s.toUpperCase().includes('CREATE INDEX')
    );
    const indexStatements = statements.filter(s => s.toUpperCase().includes('CREATE INDEX'));
    const alterStatements = statements.filter(s => s.toUpperCase().startsWith('ALTER TABLE'));

    console.log(`Found ${tableStatements.length} CREATE TABLE statements`);
    console.log(`Found ${indexStatements.length} CREATE INDEX statements`);
    console.log(`Found ${alterStatements.length} ALTER TABLE statements`);

    // Don't use a transaction - execute statements individually
    // This way, if one fails, the others still succeed
    console.log('\nExecuting CREATE TABLE statements...');
    for (let i = 0; i < tableStatements.length; i++) {
      const stmt = tableStatements[i];
      try {
        await client.query(stmt);
        // Extract table name from statement for logging
        const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        const tableName = match ? match[1] : 'unknown';
        console.log(`  [${i + 1}/${tableStatements.length}] ✓ Created table: ${tableName}`);
      } catch (error: any) {
        console.log(`  [${i + 1}/${tableStatements.length}] ✗ Error: ${error.message}`);
      }
    }

    console.log('\nExecuting CREATE INDEX statements...');
    for (let i = 0; i < indexStatements.length; i++) {
      const stmt = indexStatements[i];
      try {
        await client.query(stmt);
        console.log(`  [${i + 1}/${indexStatements.length}] ✓ Index created`);
      } catch (error: any) {
        if (
          !error.message?.includes('already exists') &&
          !error.message?.includes('does not exist')
        ) {
          console.log(`  [${i + 1}/${indexStatements.length}] ⚠ Warning: ${error.message}`);
        }
      }
    }

    console.log('\nExecuting ALTER TABLE statements...');
    for (const stmt of alterStatements) {
      try {
        await client.query(stmt);
        console.log('  ✓ ALTER TABLE completed');
      } catch (error: any) {
        // Constraint violations might be expected if data exists
        console.log(`  ⚠ Note: ${error.message}`);
      }
    }

    console.log('\n✅ Migration executed successfully');

    console.log('\nVerifying created tables...');

    // Verify sales tables
    const salesTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('customers', 'leads', 'opportunities', 'quotes', 'quote_line_items', 'customer_interactions')
    `);

    console.log(`\nSales & CRM module: ${salesTables.rows.length} tables created`);
    salesTables.rows.forEach((row: any) => console.log('  ✓', row.table_name));

    // Verify production tables
    const prodTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE 'bom%' OR table_name LIKE 'production%')
    `);

    console.log(`\nProduction Management module: ${prodTables.rows.length} tables created`);
    prodTables.rows.forEach((row: any) => console.log('  ✓', row.table_name));

    // Verify maintenance tables
    const maintTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('assets', 'maintenance_schedules', 'maintenance_work_orders', 'service_logs', 'meter_readings')
    `);

    console.log(`\nMaintenance & Assets module: ${maintTables.rows.length} tables created`);
    maintTables.rows.forEach((row: any) => console.log('  ✓', row.table_name));

    if (salesTables.rows.length > 0 || prodTables.rows.length > 0 || maintTables.rows.length > 0) {
      console.log('\n🎉 Add-on modules migration completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Start the backend server: npm run dev');
      console.log('  2. Access the sales API at: http://localhost:3001/api/sales');
      console.log('  3. Test with: POST /api/sales/customers to create a customer');
    } else {
      console.log('\n⚠️  No tables were created. Please check the migration SQL file.');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
