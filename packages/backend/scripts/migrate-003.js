/**
 * Migration runner for Phase 3 tables
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../dist/config/database');

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/003_phase3_tables.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  const client = await pool.connect();

  try {
    console.log('Starting Phase 3 migration...');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }

    console.log('Phase 3 migration completed successfully!');
    console.log('Created tables:');
    console.log('  - business_rules');
    console.log('  - rule_conditions');
    console.log('  - rule_actions');
    console.log('  - rule_execution_logs');
    console.log('  - reports');
    console.log('  - report_executions');
    console.log('  - report_schedules');
    console.log('  - dashboards');
    console.log('  - export_jobs');
    console.log('  - integrations');
    console.log('  - sync_jobs');
    console.log('  - sync_job_logs');
    console.log('  - webhook_events');
    console.log('  - carrier_accounts');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
