const { query } = require('./dist/db/client');

async function testUpdate() {
  const userId = 'USR-PICK01';
  const testView = '/orders/ORD-TEST-0001/pick';
  
  try {
    // Update current view
    await query(`
      UPDATE users
      SET current_view = $1,
          current_view_updated_at = NOW()
      WHERE user_id = $2
    `, [testView, userId]);
    
    console.log('✓ Updated current_view for user:', userId);
    console.log('✓ New view:', testView);
    
    // Verify update
    const result = await query(`
      SELECT user_id, name, current_view, current_view_updated_at
      FROM users
      WHERE user_id = $1
    `, [userId]);
    
    console.log('\nVerification result:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    // Now test picker activity API
    console.log('\n--- Testing picker activity API ---');
    
    // Get all pickers
    const pickers = await query(`
      SELECT user_id, name
      FROM users
      WHERE active = true AND role = 'PICKER'
      ORDER BY user_id
    `);
    
    console.log('Active pickers:', pickers.rows.length);
    
    const pickerIds = pickers.rows.map(r => r.user_id);
    
    // Get current view for our test picker
    const userResult = await query(`
      SELECT current_view, current_view_updated_at
      FROM users
      WHERE user_id = $1
    `, [userId]);
    
    const userData = userResult.rows[0];
    console.log('\nTest picker current_view:');
    console.log('  current_view:', userData.current_view);
    console.log('  current_view_updated_at:', userData.current_view_updated_at);
    
    const currentView = userData.current_view;
    const currentViewUpdated = userData.current_view_updated_at;
    
    console.log('\nActivity check:');
    console.log('  Has current_view:', !!currentView);
    console.log('  Has current_view_updated_at:', !!currentViewUpdated);
    
    if (currentView) {
      console.log('  View value:', currentView);
      console.log('  View updated at:', currentViewUpdated);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testUpdate();