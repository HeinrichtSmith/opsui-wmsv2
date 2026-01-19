const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function checkDb() {
  try {
    console.log('Checking users table...');
    const result = await pool.query('SELECT * FROM users LIMIT 5');
    console.log('Users found:', result.rows.length);
    console.log('Raw user data:', JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\nUser columns:', Object.keys(user));
      console.log('User user_id:', user.user_id);
      
      // Test getUserSafe query
      const safeResult = await pool.query(
        'SELECT user_id, name, email, role, active, current_task_id, created_at, last_login_at FROM users WHERE user_id = $1',
        [user.user_id]
      );
      console.log('\ngetUserSafe query result rows:', safeResult.rows.length);
      console.log('getUserSafe result:', JSON.stringify(safeResult.rows, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDb();