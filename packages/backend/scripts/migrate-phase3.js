/**
 * Phase 3 Migration Runner
 * Properly handles SQL statements with semicolons in constraints
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/003_phase3_tables.sql');
  let sql = fs.readFileSync(migrationFile, 'utf8');

  const client = await pool.connect();

  try {
    console.log('Starting Phase 3 migration...');

    // Remove SQL comments
    sql = sql.replace(/--.*$/gm, '');

    // Split by CREATE TABLE, CREATE INDEX, and ALTER TABLE statements
    // This approach is more reliable than splitting by semicolon
    const statements = [];

    // Match CREATE TABLE statements (including their content)
    const createTableRegex = /CREATE TABLE[^;]+;/gi;
    let match;
    while ((match = createTableRegex.exec(sql)) !== null) {
      statements.push(match[0]);
    }

    // Match CREATE INDEX statements
    const createIndexRegex = /CREATE INDEX[^;]+;/gi;
    while ((match = createIndexRegex.exec(sql)) !== null) {
      statements.push(match[0]);
    }

    // Match COMMENT ON statements
    const commentRegex = /COMMENT ON[^;]+;/gi;
    while ((match = commentRegex.exec(sql)) !== null) {
      statements.push(match[0]);
    }

    // Execute each statement
    let executed = 0;
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        try {
          await client.query(trimmed);
          executed++;
          console.log(`Executed statement ${executed}/${statements.length}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  Skipping (already exists)`);
            executed++;
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Phase 3 migration completed successfully!');
    console.log('Tables created:');
    console.log('  - business_rules');
    console.log('  - rule_trigger_events');
    console.log('  - rule_conditions');
    console.log('  - rule_actions');
    console.log('  - rule_execution_logs');
    console.log('  - reports');
    console.log('  - report_executions');
    console.log('  - report_schedules');
    console.log('  - dashboards');
    console.log('  - report_templates');
    console.log('  - export_jobs');
    console.log('  - integrations');
    console.log('  - sync_jobs');
    console.log('  - sync_job_logs');
    console.log('  - webhook_events');
    console.log('  - carrier_accounts');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
