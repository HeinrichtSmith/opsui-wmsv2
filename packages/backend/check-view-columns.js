const { query } = require('./src/db/client.js');

(async () => {
  try {
    const result = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name LIKE '%view%' 
      ORDER BY ordinal_position
    `);
    console.log('View-related columns:', JSON.stringify(result.rows, null, 2));

    // Also check current data
    const currentData = await query(`
      SELECT user_id, name, current_view, current_view_updated_at, NOW() as server_time
      FROM users 
      WHERE role = 'PICKER'
      LIMIT 5
    `);
    console.log('\nCurrent picker data:', JSON.stringify(currentData.rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
})();
