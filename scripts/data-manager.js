#!/usr/bin/env node
/**
 * Streamlined Data Manager for GLM
 *
 * ONE script to handle all data operations:
 * - seed:     Add sample data (safe, additive)
 * - reset:    Complete data reset (drop + migrate + seed)
 * - clean:    Remove all data but keep schema
 * - refresh:  Re-seed existing data (update existing, add new)
 * - backup:   Create a backup before destructive operations
 * - restore:  Restore from a backup file
 * - export:   Export data to JSON file
 * - import:   Import data from JSON file
 * - fix:      Fix common data issues
 * - validate: Validate data integrity
 * - status:   Show database status
 *
 * Usage:
 *   node scripts/data-manager.js <command> [args]
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// POSTGRESQL SAFETY CHECKS
// ============================================================================

/**
 * Verify database exists and is accessible
 */
async function checkDatabase() {
  log('\n🔍 Checking database connection...', 'cyan');

  return new Promise((resolve, reject) => {
    const check = spawn('npx', ['-y', 'tsx', 'src/db/check-db.ts'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'pipe',
    });

    let output = '';
    check.stdout.on('data', data => {
      output += data.toString();
    });

    check.on('close', code => {
      if (code === 0) {
        log('✅ Database is accessible', 'green');
        resolve();
      } else {
        log('❌ Database is not accessible', 'red');
        reject(new Error('Database connection failed'));
      }
    });

    check.on('error', reject);
  });
}

// ============================================================================
// DATA OPERATIONS
// ============================================================================

/**
 * Run database migrations (create schema)
 */
async function runMigrations() {
  log('\n📋 Running database migrations...', 'cyan');

  return new Promise((resolve, reject) => {
    const migrate = spawn('npm', ['run', 'db:migrate'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    migrate.on('close', code => {
      if (code === 0) {
        log('✅ Migrations completed', 'green');
        resolve();
      } else {
        log('❌ Migrations failed', 'red');
        reject(new Error('Migration failed'));
      }
    });

    migrate.on('error', reject);
  });
}

/**
 * Seed database with sample data
 */
async function runSeed(options = {}) {
  log('\n🌱 Seeding database with sample data...', 'cyan');

  const args = [];
  if (options.usersOnly) args.push('--users-only');
  if (options.skusOnly) args.push('--skus-only');
  if (options.ordersOnly) args.push('--orders-only');

  return new Promise((resolve, reject) => {
    const seed = spawn('npx', ['-y', 'tsx', 'src/db/seed.ts', ...args], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    seed.on('close', code => {
      if (code === 0) {
        log('✅ Seed completed', 'green');
        resolve();
      } else {
        log('❌ Seed failed', 'red');
        reject(new Error('Seed failed'));
      }
    });

    seed.on('error', reject);
  });
}

/**
 * Create a backup
 */
async function runBackup(name) {
  log('\n💾 Creating database backup...', 'cyan');

  const args = ['create'];
  if (name) args.push(name);

  return new Promise((resolve, reject) => {
    const backup = spawn('npx', ['-y', 'tsx', 'src/db/backup.ts', ...args], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    backup.on('close', code => {
      if (code === 0) {
        log('✅ Backup created', 'green');
        resolve();
      } else {
        log('⚠️  Backup failed (continuing anyway)', 'yellow');
        resolve(); // Don't fail on backup error
      }
    });

    backup.on('error', () => {
      log('⚠️  Backup failed (continuing anyway)', 'yellow');
      resolve(); // Don't fail on backup error
    });
  });
}

/**
 * Reset database (drop + migrate + seed)
 */
async function runReset() {
  log('\n🔄 Resetting database...', 'yellow');
  log('⚠️  This will DELETE ALL DATA', 'red');

  return new Promise((resolve, reject) => {
    const reset = spawn('npm', ['run', 'db:reset'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    reset.on('close', code => {
      if (code === 0) {
        log('✅ Database reset completed', 'green');
        resolve();
      } else {
        log('❌ Database reset failed', 'red');
        reject(new Error('Reset failed'));
      }
    });

    reset.on('error', reject);
  });
}

/**
 * Clean all data but keep schema
 */
async function runClean() {
  log('\n🧹 Cleaning all data (keeping schema)...', 'cyan');

  return new Promise((resolve, reject) => {
    const clean = spawn('npx', ['-y', 'tsx', 'src/db/clean-data.ts'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    clean.on('close', code => {
      if (code === 0) {
        log('✅ Data cleaned', 'green');
        resolve();
      } else {
        log('⚠️  Clean script not found, using SQL...', 'yellow');
        // Fallback to SQL clean
        cleanWithSQL().then(resolve).catch(reject);
      }
    });

    clean.on('error', () => {
      log('⚠️  Clean script not found, using SQL...', 'yellow');
      cleanWithSQL().then(resolve).catch(reject);
    });
  });
}

/**
 * Clean data using raw SQL (fallback)
 */
async function cleanWithSQL() {
  const { Pool } = require('pg');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  try {
    await pool.query(`
      TRUNCATE TABLE
        order_state_changes,
        inventory_transactions,
        pick_tasks,
        order_items,
        orders,
        inventory_units,
        bin_locations,
        skus,
        users
      CASCADE;
    `);
    log('✅ Data cleaned via SQL', 'green');
  } finally {
    await pool.end();
  }
}

// ============================================================================
// FIX OPERATIONS (Consolidated from ad-hoc scripts)
// ============================================================================

/**
 * Fix stuck orders
 */
async function fixStuckOrders(orderId) {
  log('\n🔧 Fixing stuck orders...', 'cyan');

  const args = ['--list'];
  if (orderId) args.unshift(orderId);

  return new Promise((resolve, reject) => {
    const fix = spawn('npx', ['-y', 'tsx', 'src/db/reset-stuck-orders.ts', ...args], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    fix.on('close', code => {
      if (code === 0) {
        log('✅ Stuck orders fixed', 'green');
        resolve();
      } else {
        log('❌ Fix failed', 'red');
        reject(new Error('Fix failed'));
      }
    });

    fix.on('error', reject);
  });
}

/**
 * Activate all users
 */
async function activateUsers() {
  log('\n👤 Activating all users...', 'cyan');

  return new Promise((resolve, reject) => {
    const activate = spawn('npx', ['-y', 'tsx', 'src/db/activate-users.ts'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    activate.on('close', code => {
      if (code === 0) {
        log('✅ All users activated', 'green');
        resolve();
      } else {
        log('❌ Activation failed', 'red');
        reject(new Error('Activation failed'));
      }
    });

    activate.on('error', reject);
  });
}

/**
 * Validate data integrity
 */
async function validateData() {
  log('\n✓ Validating data integrity...', 'cyan');

  const { Pool } = require('pg');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  try {
    const issues = [];

    // Check for users without passwords
    const noPassword = await pool.query(
      "SELECT user_id, email FROM users WHERE password_hash IS NULL OR password_hash = ''"
    );
    if (noPassword.rows.length > 0) {
      issues.push(`${noPassword.rows.length} users without passwords`);
    }

    // Check for inactive users
    const inactiveUsers = await pool.query('SELECT COUNT(*) FROM users WHERE active = false');
    if (parseInt(inactiveUsers.rows[0].count) > 0) {
      issues.push(`${inactiveUsers.rows[0].count} inactive users`);
    }

    // Check for orders in PICKING status for > 1 hour
    const stuckOrders = await pool.query(`
      SELECT COUNT(*) FROM orders
      WHERE status = 'PICKING'
      AND claimed_at < NOW() - INTERVAL '1 hour'
    `);
    if (parseInt(stuckOrders.rows[0].count) > 0) {
      issues.push(`${stuckOrders.rows[0].count} potentially stuck orders`);
    }

    // Check for negative inventory
    const negativeInventory = await pool.query(`
      SELECT COUNT(*) FROM inventory_units WHERE quantity < 0
    `);
    if (parseInt(negativeInventory.rows[0].count) > 0) {
      issues.push(`${negativeInventory.rows[0].count} inventory units with negative quantity`);
    }

    if (issues.length === 0) {
      log('✅ No data integrity issues found', 'green');
    } else {
      log('⚠️  Data integrity issues:', 'yellow');
      issues.forEach(issue => log(`  • ${issue}`, 'yellow'));
    }

    log(`\n${issues.length} issue(s) found`, issues.length === 0 ? 'green' : 'yellow');
  } finally {
    await pool.end();
  }
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

/**
 * Export database to JSON file
 */
async function exportData(filename) {
  log('\n📤 Exporting database...', 'cyan');

  const exportName = filename || `export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  return new Promise((resolve, reject) => {
    const backup = spawn('npx', ['-y', 'tsx', 'src/db/backup.ts', 'create', exportName], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    backup.on('close', code => {
      if (code === 0) {
        log(`✅ Exported to ${exportName}`, 'green');
        resolve();
      } else {
        log('❌ Export failed', 'red');
        reject(new Error('Export failed'));
      }
    });

    backup.on('error', reject);
  });
}

/**
 * Import database from JSON file
 */
async function importData(filename) {
  log('\n📥 Importing database...', 'cyan');

  if (!filename) {
    log('❌ No file specified', 'red');
    throw new Error('No file specified');
  }

  return new Promise((resolve, reject) => {
    const backup = spawn('npx', ['-y', 'tsx', 'src/db/backup.ts', 'restore', filename], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    backup.on('close', code => {
      if (code === 0) {
        log('✅ Import completed', 'green');
        resolve();
      } else {
        log('❌ Import failed', 'red');
        reject(new Error('Import failed'));
      }
    });

    backup.on('error', reject);
  });
}

/**
 * List backups
 */
async function listBackups() {
  log('\n📚 Available backups:', 'cyan');

  return new Promise((resolve, reject) => {
    const backup = spawn('npx', ['-y', 'tsx', 'src/db/backup.ts', 'list'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'inherit',
    });

    backup.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        log('No backups found', 'yellow');
        resolve();
      }
    });

    backup.on('error', reject);
  });
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * Command: seed
 */
async function commandSeed() {
  log('='.repeat(70), 'blue');
  log('🌱 SEED DATA MODE', 'green');
  log('='.repeat(70), 'blue');

  const options = {
    usersOnly: process.argv.includes('--users-only'),
    skusOnly: process.argv.includes('--skus-only'),
    ordersOnly: process.argv.includes('--orders-only'),
  };

  if (Object.values(options).some(v => v)) {
    log('\nSelective seeding enabled:', 'yellow');
    if (options.usersOnly) log('  • Users only', 'reset');
    if (options.skusOnly) log('  • SKUs only', 'reset');
    if (options.ordersOnly) log('  • Orders only', 'reset');
    log('');
  } else {
    log('\nThis will add sample data to your database.', 'yellow');
    log('Existing data will NOT be overwritten.\n', 'yellow');
  }

  await checkDatabase();
  await runSeed(options);

  log('\n' + '='.repeat(70), 'blue');
  log('✅ SEED COMPLETE', 'green');
  log('='.repeat(70), 'blue');
  showLoginInfo();
}

/**
 * Command: reset
 */
async function commandReset() {
  log('='.repeat(70), 'red');
  log('⚠️  DATABASE RESET MODE', 'yellow');
  log('='.repeat(70), 'red');
  log('\n⚠️  WARNING: This will DELETE ALL DATA and recreate the database.', 'red');
  log('\nThis operation:', 'yellow');
  log('  1. Creates a backup (if possible)', 'reset');
  log('  2. Drops all tables', 'reset');
  log('  3. Recreates schema', 'reset');
  log('  4. Seeds fresh sample data', 'reset');
  log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n', 'cyan');

  // Countdown for safety
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  process.stdout.write('\rGO!  \n');

  await checkDatabase();

  // Try to create backup first
  log('\n💾 Attempting to create pre-reset backup...', 'cyan');
  await runBackup('pre-reset-backup');

  await runReset();

  log('\n' + '='.repeat(70), 'blue');
  log('✅ DATABASE RESET COMPLETE', 'green');
  log('='.repeat(70), 'blue');
  showLoginInfo();
}

/**
 * Command: clean
 */
async function commandClean() {
  log('='.repeat(70), 'yellow');
  log('🧹 CLEAN DATA MODE', 'cyan');
  log('='.repeat(70), 'yellow');
  log('\nThis will remove all data but keep the schema.\n', 'yellow');

  await checkDatabase();

  // Try to create backup first
  log('\n💾 Attempting to create pre-clean backup...', 'cyan');
  await runBackup('pre-clean-backup');

  await runClean();

  log('\n' + '='.repeat(70), 'blue');
  log('✅ CLEAN COMPLETE', 'green');
  log('='.repeat(70), 'blue');
  log('\nAll data has been removed. Schema is intact.\n', 'cyan');
  log('Run "seed" to add sample data back.\n', 'yellow');
}

/**
 * Command: refresh
 */
async function commandRefresh() {
  log('='.repeat(70), 'blue');
  log('🔄 REFRESH DATA MODE', 'cyan');
  log('='.repeat(70), 'blue');
  log('\nThis will update existing data and add any new sample data.\n', 'yellow');

  await checkDatabase();
  await runSeed();

  log('\n' + '='.repeat(70), 'blue');
  log('✅ REFRESH COMPLETE', 'green');
  log('='.repeat(70), 'blue');
  log('\nData has been refreshed.\n', 'cyan');
}

/**
 * Command: status
 */
async function commandStatus() {
  log('='.repeat(70), 'blue');
  log('📊 DATABASE STATUS', 'cyan');
  log('='.repeat(70), 'blue');

  const { Pool } = require('pg');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  try {
    const tables = await pool.query(`
      SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const counts = await pool.query(`
      SELECT
        'users' as table_name, (SELECT COUNT(*) FROM users) as count
      UNION ALL SELECT 'skus', (SELECT COUNT(*) FROM skus)
      UNION ALL SELECT 'orders', (SELECT COUNT(*) FROM orders)
      UNION ALL SELECT 'order_items', (SELECT COUNT(*) FROM order_items)
      UNION ALL SELECT 'inventory_units', (SELECT COUNT(*) FROM inventory_units)
      UNION ALL SELECT 'bin_locations', (SELECT COUNT(*) FROM bin_locations);
    `);

    log('\n📋 Tables:', 'cyan');
    tables.rows.forEach(row => {
      log(`  ${row.tablename.padEnd(20)} ${row.size || 'N/A'}`, 'reset');
    });

    log('\n📈 Record Counts:', 'cyan');
    counts.rows.forEach(row => {
      log(`  ${row.table_name.padEnd(20)} ${row.count.toString().padStart(6)}`, 'reset');
    });

    // Check for issues
    const issues = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE active = false) as inactive_users,
        (SELECT COUNT(*) FROM orders WHERE status = 'PICKING') as picking_orders,
        (SELECT COUNT(*) FROM inventory_units WHERE quantity < 0) as negative_inventory
    `);

    const { inactive_users, picking_orders, negative_inventory } = issues.rows[0];

    if (
      parseInt(inactive_users) > 0 ||
      parseInt(picking_orders) > 0 ||
      parseInt(negative_inventory) > 0
    ) {
      log('\n⚠️  Issues:', 'yellow');
      if (parseInt(inactive_users) > 0) {
        log(`  • ${inactive_users} inactive users`, 'reset');
      }
      if (parseInt(picking_orders) > 0) {
        log(`  • ${picking_orders} orders in PICKING`, 'reset');
      }
      if (parseInt(negative_inventory) > 0) {
        log(`  • ${negative_inventory} negative inventory`, 'reset');
      }
    }

    log('\n' + '='.repeat(70), 'blue');
  } catch (error) {
    log('\n❌ Failed to get database status', 'red');
    log(error.message, 'red');
  } finally {
    await pool.end();
  }
}

/**
 * Command: backup
 */
async function commandBackup() {
  const backupName = process.argv[3];

  log('='.repeat(70), 'blue');
  log('💾 BACKUP MODE', 'cyan');
  log('='.repeat(70), 'blue');

  await checkDatabase();
  await runBackup(backupName);

  log('\n' + '='.repeat(70), 'blue');
  log('✅ BACKUP COMPLETE', 'green');
  log('='.repeat(70), 'blue');
}

/**
 * Command: restore
 */
async function commandRestore() {
  const filename = process.argv[3];

  if (!filename) {
    log('\n❌ No backup file specified', 'red');
    log('\nUsage: node scripts/data-manager.js restore <backup-file>', 'cyan');
    log('       node scripts/data-manager.js restore list  (to see available backups)\n', 'yellow');
    return;
  }

  if (filename === 'list') {
    await listBackups();
    return;
  }

  log('='.repeat(70), 'yellow');
  log('📥 RESTORE MODE', 'cyan');
  log('='.repeat(70), 'yellow');
  log(`\n⚠️  This will REPLACE ALL DATA with: ${filename}`, 'red');
  log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n', 'cyan');

  // Countdown
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  process.stdout.write('\rGO!  \n');

  await checkDatabase();
  await importData(filename);

  log('\n' + '='.repeat(70), 'blue');
  log('✅ RESTORE COMPLETE', 'green');
  log('='.repeat(70), 'blue');
}

/**
 * Command: export
 */
async function commandExport() {
  const filename = process.argv[3];

  log('='.repeat(70), 'blue');
  log('📤 EXPORT MODE', 'cyan');
  log('='.repeat(70), 'blue');

  await checkDatabase();
  await exportData(filename);

  log('\n' + '='.repeat(70), 'blue');
  log('✅ EXPORT COMPLETE', 'green');
  log('='.repeat(70), 'blue');
}

/**
 * Command: import
 */
async function commandImport() {
  const filename = process.argv[3];

  if (!filename) {
    log('\n❌ No import file specified', 'red');
    log('\nUsage: node scripts/data-manager.js import <file.json>\n', 'cyan');
    return;
  }

  log('='.repeat(70), 'yellow');
  log('📥 IMPORT MODE', 'cyan');
  log('='.repeat(70), 'yellow');
  log(`\n⚠️  This will REPLACE ALL DATA with: ${filename}`, 'red');
  log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n', 'cyan');

  // Countdown
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r${i}... `);
    await new Promise(r => setTimeout(r, 1000));
  }
  process.stdout.write('\rGO!  \n');

  await checkDatabase();
  await importData(filename);

  log('\n' + '='.repeat(70), 'blue');
  log('✅ IMPORT COMPLETE', 'green');
  log('='.repeat(70), 'blue');
}

/**
 * Command: fix
 */
async function commandFix() {
  const fixType = process.argv[3];
  const arg = process.argv[4];

  log('='.repeat(70), 'blue');
  log('🔧 FIX MODE', 'cyan');
  log('='.repeat(70), 'blue');

  await checkDatabase();

  switch (fixType) {
    case 'stuck-orders':
    case 'stuck':
      await fixStuckOrders(arg);
      break;
    case 'activate-users':
    case 'users':
      await activateUsers();
      break;
    default:
      log('\nAvailable fix commands:', 'cyan');
      log('  stuck-orders [order-id]  - Fix stuck orders (or list them)', 'reset');
      log('  activate-users          - Activate all users', 'reset');
      log('');
      return;
  }

  log('\n' + '='.repeat(70), 'blue');
  log('✅ FIX COMPLETE', 'green');
  log('='.repeat(70), 'blue');
}

/**
 * Command: validate
 */
async function commandValidate() {
  log('='.repeat(70), 'blue');
  log('✓ VALIDATE MODE', 'cyan');
  log('='.repeat(70), 'blue');

  await checkDatabase();
  await validateData();

  log('\n' + '='.repeat(70), 'blue');
}

/**
 * Show login information
 */
function showLoginInfo() {
  log('\n🔐 Login credentials:', 'yellow');
  log('  Admin:  admin@wms.local / admin123', 'reset');
  log('  Users:  any@wms.local / password123', 'reset');
  log('');
}

/**
 * Command: help
 */
async function commandHelp() {
  log('\n' + '='.repeat(70), 'blue');
  log('📚 DATA MANAGER - Help', 'cyan');
  log('='.repeat(70), 'blue');
  log('\nUsage: node scripts/data-manager.js <command> [args]\n', 'yellow');

  log('Commands:', 'cyan');
  log('  seed                    Add sample data (safe, additive)', 'reset');
  log('  seed --users-only       Seed only users', 'reset');
  log('  seed --skus-only        Seed only SKUs', 'reset');
  log('  seed --orders-only      Seed only orders', 'reset');
  log('  reset                   Complete database reset (with backup)', 'reset');
  log('  clean                   Remove all data (keep schema, with backup)', 'reset');
  log('  refresh                 Update existing data and add new', 'reset');
  log('  status                  Show database status and record counts', 'reset');
  log('  validate                Validate data integrity', 'reset');
  log('  backup [name]           Create a backup', 'reset');
  log('  restore <file|list>     Restore from backup (or list backups)', 'reset');
  log('  export [filename]       Export database to JSON', 'reset');
  log('  import <file>           Import database from JSON', 'reset');
  log('  fix stuck-orders [id]   Fix stuck orders (or list them)', 'reset');
  log('  fix activate-users      Activate all users', 'reset');
  log('  help                    Show this help message', 'reset');

  log('\nExamples:', 'cyan');
  log('  node scripts/data-manager.js seed', 'reset');
  log('  node scripts/data-manager.js reset', 'reset');
  log('  node scripts/data-manager.js status', 'reset');
  log('  node scripts/data-manager.js fix stuck-orders', 'reset');
  log('  node scripts/data-manager.js backup my-backup', 'reset');
  log('  node scripts/data-manager.js restore list', 'reset');

  log('\nGLM Usage:', 'yellow');
  log('  "Seed the database"              → node scripts/data-manager.js seed', 'reset');
  log('  "Reset all data"                 → node scripts/data-manager.js reset', 'reset');
  log('  "Clean the database"             → node scripts/data-manager.js clean', 'reset');
  log('  "Show database status"           → node scripts/data-manager.js status', 'reset');
  log('  "Validate data"                  → node scripts/data-manager.js validate', 'reset');
  log(
    '  "Fix stuck orders"               → node scripts/data-manager.js fix stuck-orders',
    'reset'
  );
  log('  "Create backup"                  → node scripts/data-manager.js backup', 'reset');
  log('  "List backups"                   → node scripts/data-manager.js restore list', 'reset');
  log('');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const command = process.argv[2] || 'help';

  try {
    switch (command) {
      case 'seed':
        await commandSeed();
        break;
      case 'reset':
        await commandReset();
        break;
      case 'clean':
        await commandClean();
        break;
      case 'refresh':
        await commandRefresh();
        break;
      case 'status':
        await commandStatus();
        break;
      case 'backup':
        await commandBackup();
        break;
      case 'restore':
        await commandRestore();
        break;
      case 'export':
        await commandExport();
        break;
      case 'import':
        await commandImport();
        break;
      case 'fix':
        await commandFix();
        break;
      case 'validate':
        await commandValidate();
        break;
      case 'help':
      default:
        await commandHelp();
        break;
    }

    process.exit(0);
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run
main();
