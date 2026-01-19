const { query } = require('./dist/db/client');

async function testDirectUpdate() {
  try {
    console.log('Testing direct database update...');
    
    // Get a picker user
    const userResult = await query(`
      SELECT user_id, name, current_view, current_view_updated_at 
      FROM users 
      WHERE role = 'PICKER' 
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('No picker users found');
      process.exit(0);
    }
    
    const user = userResult.rows[0];
    console.log('\nBefore update:');
    console.log('  User:', user.name);
    console.log('  Current view:', user.current_view);
    console.log('  Updated at:', user.current_view_updated_at);
    
    // Test the exact same query that AuthService uses
    console.log('\nExecuting UPDATE query...');
    const updateResult = await query(
      `UPDATE users
       SET current_view = $1,
           current_view_updated_at = NOW()
       WHERE user_id = $2`,
      ['TEST-DIRECT-UPDATE', user.user_id]
    );
    
    console.log('  Rows affected:', updateResult.rowCount);
    
    // Check the result
    const afterResult = await query(`
      SELECT user_id, name, current_view, current_view_updated_at, NOW() as server_time
      FROM users 
      WHERE user_id = $1
    `, [user.user_id]);
    
    const afterUser = afterResult.rows[0];
    console.log('\nAfter update:');
    console.log('  User:', afterUser.name);
    console.log('  Current view:', afterUser.current_view);
    console.log('  Updated at:', afterUser.current_view_updated_at);
    console.log('  Server time:', afterUser.server_time);
    
    // Restore original view
    await query(
      `UPDATE users
       SET current_view = $1,
           current_view_updated_at = $2
       WHERE user_id = $3`,
      [user.current_view, user.current_view_updated_at, user.user_id]
    );
    
    console.log('\n✅ Direct update test completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testDirectUpdate();