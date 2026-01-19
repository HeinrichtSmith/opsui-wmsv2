/**
 * Debug script to check if current_view updates are actually happening
 */

async function checkViewUpdates() {
  const { query } = await import('./src/db/client');

  console.log('=== Checking Current View Updates ===\n');

  // Check current state of pickers
  const result = await query(`
    SELECT 
      user_id,
      email,
      name,
      current_view,
      current_view_updated_at,
      NOW() as server_time,
      EXTRACT(EPOCH FROM (NOW() - current_view_updated_at))/60 as minutes_ago,
      last_login_at
    FROM users
    WHERE role = 'PICKER'
    ORDER BY current_view_updated_at DESC NULLS LAST
  `);

  console.log('Current picker states:');
  result.rows.forEach((row, index) => {
    console.log(`\n${index + 1}. ${row.email} (${row.name})`);
    console.log(`   Current View: ${row.current_view || 'NULL'}`);
    console.log(`   Last Updated: ${row.current_view_updated_at || 'NEVER'}`);
    console.log(`   Minutes Ago: ${row.minutes_ago ? row.minutes_ago.toFixed(2) : 'NEVER'}`);
    console.log(`   Last Login: ${row.last_login_at || 'NEVER'}`);
    
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const updateDate = row.current_view_updated_at ? new Date(row.current_view_updated_at) : null;
    const inWindow = updateDate && updateDate >= fiveMinAgo;
    
    console.log(`   Should be ACTIVE: ${inWindow ? 'YES' : 'NO'}`);
    console.log(`   Current View indicates Order Queue: ${row.current_view === 'Order Queue' ? 'YES' : 'NO'}`);
  });

  console.log('\n=== Complete ===');
}

checkViewUpdates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });