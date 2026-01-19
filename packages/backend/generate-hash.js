/**
 * Generate bcrypt hash and create SQL fix script
 */

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function generate() {
  const password = 'admin123';
  const rounds = 10;
  
  console.log('Generating bcrypt hash...');
  console.log(`Password: ${password}`);
  console.log(`Rounds: ${rounds}`);
  
  const hash = await bcrypt.hash(password, rounds);
  
  console.log(`\nGenerated hash: ${hash}`);
  console.log(`Hash length: ${hash.length}\n`);
  
  // Verify hash works
  const isValid = await bcrypt.compare(password, hash);
  console.log(`Verification test: ${isValid ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  // Create SQL statements
  const sql = `
-- Fix admin password hash
-- Generated: ${new Date().toISOString()}
-- Password: admin123
-- Rounds: 10
-- Hash length: ${hash.length}

-- Delete old admin user
DELETE FROM users WHERE email = 'admin@wms.local';

-- Insert admin user with correct password hash
INSERT INTO users (user_id, name, email, password_hash, role, active)
VALUES (
  'USR-ADMIN01',
  'System Administrator',
  'admin@wms.local',
  '${hash}',
  'ADMIN',
  true
);

-- Verify insertion
SELECT user_id, email, name, role FROM users WHERE email = 'admin@wms.local';
`;

  console.log('SQL script generated:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  
  // Save to file
  const outputPath = path.join(__dirname, 'fix-admin-hash.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`\n✅ SQL script saved to: ${outputPath}`);
  
  console.log('\nTo apply this fix:');
  console.log('1. Connect to your PostgreSQL database');
  console.log(`2. Run: psql -d wms_db -f ${outputPath}`);
  console.log('\nOr run the backend dev server which will auto-fix on first login attempt');
}

generate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});