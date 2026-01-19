const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'dist/services/MetricsService.js');

if (!fs.existsSync(servicePath)) {
  console.log('MetricsService.js not found at:', servicePath);
  console.log('The dist folder is empty. Need to compile first.');
  process.exit(1);
}

console.log('=== Fixing Compiled MetricsService.js ===\n');

let content = fs.readFileSync(servicePath, 'utf-8');

// Fix 1: Add AS alias to first query
content = content.replace(
  `SELECT user_id, name
      FROM users
      WHERE active = true AND role = 'PICKER'
      ORDER BY user_id`,
  `SELECT user_id AS userId, name
      FROM users
      WHERE active = true AND role = 'PICKER'
      ORDER BY user_id`
);

// Fix 2: Update logging to use camelCase
content = content.replace(
  `pickers: activePickers.rows.map(r => ({ id: r.user_id, name: r.name })),`,
  `pickers: activePickers.rows.map(r => ({ userId: r.userId, name: r.name })),`
);

// Fix 3: Update pickerIds to use camelCase
content = content.replace(
  `pickerIds: activePickers.rows.map(r => r.user_id)`,
  `pickerIds: activePickers.rows.map(r => r.userId)`
);

// Fix 4: Build picker activity with camelCase
content = content.replace(
  `const pickerIds = activePickers.rows.map(r => r.user_id);`,
  `const pickerIds = activePickers.rows.map(r => r.userId);`
);

// Fix 5: User data query with AS aliases
content = content.replace(
  `SELECT last_login_at, current_view, current_view_updated_at
        FROM users
        WHERE user_id = $1`,
  `SELECT 
          last_login_at AS lastLoginAt,
          current_view AS currentView,
          current_view_updated_at AS currentViewUpdatedAt
        FROM users
        WHERE user_id = $1`
);

// Write back
fs.writeFileSync(servicePath, content, 'utf-8');

console.log('✅ Fixed compiled MetricsService.js');
console.log('Changes made:');
console.log('  - Added AS alias for user_id → userId in first query');
console.log('  - Updated logging to use camelCase property names');
console.log('  - Updated pickerIds mapping to use camelCase');
console.log('  - Added AS aliases to user data query');

// Count currentView occurrences
const count = (content.match(/currentView/g) || []).length;
console.log(`\ncurrentView occurrences in compiled file: ${count}`);

process.exit(0);