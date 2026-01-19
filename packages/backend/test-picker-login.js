const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: 'postgres://wms_user:wms_password@localhost:5432/wms_db',
});

async function testPickerLogin() {
  try {
    // Test password: picker123
    const testPassword = 'picker123';
    console.log(`Testing password: "${testPassword}"`);

    // Get John Picker account
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      'john.picker@wms.local',
    ]);

    if (result.rows.length === 0) {
      console.log('ERROR: John Picker account not found');
      return;
    }

    const user = result.rows[0];
    console.log('\nJohn Picker account:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Active:', user.active);
    console.log('  Password hash:', user.password_hash.substring(0, 20) + '...');

    // Test password comparison
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log('\nPassword validation result:');
    console.log('  Valid:', isValid);

    if (!isValid) {
      console.log('\n⚠️  The password "picker123" does NOT match the stored hash!');
      console.log('  The stored hash is for a different password.');

      // Generate a new hash for "picker123"
      console.log('\nGenerating new hash for "picker123"...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('  New hash:', newHash);

      // Update the password
      console.log('\nUpdating John Picker password in database...');
      await pool.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [
        newHash,
        'john.picker@wms.local',
      ]);
      console.log('  ✅ Password updated successfully!');

      // Verify the update
      const updatedUser = await pool.query(`SELECT password_hash FROM users WHERE email = $1`, [
        'john.picker@wms.local',
      ]);
      const isNowValid = await bcrypt.compare(testPassword, updatedUser.rows[0].password_hash);
      console.log('  Verification:', isNowValid ? '✅ Valid' : '❌ Invalid');
    } else {
      console.log('  ✅ Password is correct!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testPickerLogin();
