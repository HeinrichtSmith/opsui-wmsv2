const { query } = require('./dist/db/client');

async function testBackend() {
  console.log('=== Checking Backend Logs ===\n');

  // Get all users with their current_view
  const usersResult = await query(`
    SELECT user_id, name, role, current_view, current_view_updated_at
    FROM users
    WHERE role = 'PICKER'
    ORDER BY user_id
  `);

  console.log('Users in database:');
  console.log(JSON.stringify(usersResult.rows, null, 2));

  console.log('\n=== Testing Direct Update ===\n');

  // Test direct update
  const testUserId = 'USR-PICK01';
  const testView = '/orders/TEST-ROUTE';

  console.log(`Updating ${testUserId} to ${testView}`);
  
  await query(
    `UPDATE users
     SET current_view = $1,
         current_view_updated_at = NOW()
     WHERE user_id = $2`,
    [testView, testUserId]
  );

  console.log('✓ Update complete');

  // Verify
  const verifyResult = await query(
    `SELECT user_id, current_view, current_view_updated_at
     FROM users
     WHERE user_id = $1`,
    [testUserId]
  );

  console.log('\nVerification:');
  console.log(JSON.stringify(verifyResult.rows[0], null, 2));

  // Revert back to /orders
  console.log('\nReverting to /orders');
  await query(
    `UPDATE users
     SET current_view = $1,
         current_view_updated_at = NOW()
     WHERE user_id = $2`,
    ['/orders', testUserId]
  );

  console.log('✓ Revert complete');

  process.exit(0);
}

testBackend().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});