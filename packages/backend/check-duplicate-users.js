const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function checkDuplicates() {
  try {
    console.log('=== ALL USERS ===');
    const allUsers = await pool.query('SELECT user_id, name, email, role, active FROM users ORDER BY user_id');
    console.log('All users:', JSON.stringify(allUsers.rows, null, 2));

    console.log('\n=== USERS WITH NAME "John Picker" ===');
    const johnUsers = await pool.query("SELECT * FROM users WHERE name = 'John Picker'");
    console.log('John Picker users count:', johnUsers.rows.length);
    console.log('John Picker users:', JSON.stringify(johnUsers.rows, null, 2));

    console.log('\n=== USERS WITH NAME "Jane Picker" ===');
    const janeUsers = await pool.query("SELECT * FROM users WHERE name = 'Jane Picker'");
    console.log('Jane Picker users count:', janeUsers.rows.length);
    console.log('Jane Picker users:', JSON.stringify(janeUsers.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDuplicates();