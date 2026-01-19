const { Pool } = require('pg');

async function clearStateChanges() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    console.log('Clearing order_state_changes table...\n');

    // Check current entries
    const checkResult = await pool.query('SELECT COUNT(*) as count FROM order_state_changes');
    console.log(`Current entries: ${checkResult.rows[0].count}`);

    // Delete all entries
    const deleteResult = await pool.query('DELETE FROM order_state_changes RETURNING change_id');
    console.log(`Deleted ${deleteResult.rows.length} state change entries`);

    // Verify
    const verifyResult = await pool.query('SELECT COUNT(*) as count FROM order_state_changes');
    console.log(`\nRemaining entries: ${verifyResult.rows[0].count}`);
    console.log('\n✓ order_state_changes table cleared!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearStateChanges();