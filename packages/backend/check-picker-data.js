const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function checkPickerData() {
  try {
    console.log('=== CHECKING PICKER USERS ===');
    const users = await pool.query(
      "SELECT user_id, name, email, role, active FROM users WHERE role = 'PICKER' ORDER BY user_id"
    );
    console.log('Picker users count:', users.rows.length);
    console.log('Picker users:', JSON.stringify(users.rows, null, 2));

    console.log('\n=== CHECKING ORDERS WITH PICKERS ===');
    const orders = await pool.query(
      'SELECT order_id, picker_id, status, progress, updated_at FROM orders WHERE picker_id IS NOT NULL ORDER BY updated_at DESC LIMIT 10'
    );
    console.log('Orders with pickers count:', orders.rows.length);
    console.log('Orders with pickers:', JSON.stringify(orders.rows, null, 2));

    console.log('\n=== CHECKING PICK TASKS ===');
    const tasks = await pool.query(
      'SELECT pick_task_id, picker_id, order_id, started_at, completed_at, status FROM pick_tasks WHERE picker_id IS NOT NULL ORDER BY started_at DESC LIMIT 10'
    );
    console.log('Pick tasks count:', tasks.rows.length);
    console.log('Pick tasks:', JSON.stringify(tasks.rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkPickerData();
