/**
 * Generate bcrypt hash for bob.packer account and create SQL script
 */

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function generate() {
  const password = 'packer123';
  const rounds = 10;

  console.log('Generating bcrypt hash for bob.packer...');
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
-- Add bob.packer user account
-- Generated: ${new Date().toISOString()}
-- Password: packer123
-- Rounds: 10

-- Insert bob.packer user
INSERT INTO users (user_id, name, email, password_hash, role, active)
VALUES (
  'USR-PACK01',
  'Bob Packer',
  'bob.packer@wms.local',
  '${hash}',
  'PACKER',
  true
);

-- Verify insertion
SELECT user_id, email, name, role FROM users WHERE email = 'bob.packer@wms.local';
`;

  console.log('SQL script generated:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));

  // Save to file
  const outputPath = path.join(__dirname, 'add-bob-packer.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`\n✅ SQL script saved to: ${outputPath}`);

  console.log('\nTo apply this fix:');
  console.log('1. Connect to your PostgreSQL database');
  console.log(`2. Run: psql -d wms_db -f ${outputPath}`);
  console.log('\nOr run: node add-bob-packer.js to execute directly');
}

// Execute directly if called with --apply flag
if (process.argv.includes('--apply')) {
  const { exec } = require('child_process');
  const outputPath = path.join(__dirname, 'add-bob-packer.sql');

  console.log('Applying SQL to database...\n');
  exec(`psql -d wms_db -f "${outputPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error applying SQL:', error);
      process.exit(1);
    }
    if (stderr) {
      console.error('SQL stderr:', stderr);
    }
    console.log(stdout);
    console.log('\n✅ User bob.packer added successfully!');
    process.exit(0);
  });
} else {
  generate().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
