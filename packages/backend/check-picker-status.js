const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://wms_user:wms_password@localhost:5432/wms_db',
});

async function checkPickerStatus() {
  try {
    const result = await pool.query(
      `SELECT * 
       FROM users 
       WHERE email LIKE '%picker%'
       ORDER BY email`
    );

    console.log('Picker accounts in database:');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPickerStatus();
