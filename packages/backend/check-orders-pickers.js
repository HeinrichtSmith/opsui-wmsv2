const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function checkOrders() {
  try {
    console.log('=== ALL ORDERS ===');
    const allOrders = await pool.query('SELECT order_id, status, picker_id, progress, updated_at FROM orders ORDER BY updated_at DESC LIMIT 20');
    console.log('All orders count:', allOrders.rows.length);
    console.log('All orders:', JSON.stringify(allOrders.rows, null, 2));

    console.log('\n=== PICKER ORDERS ===');
    const pickerOrders = await pool.query('SELECT order_id, status, picker_id, progress, updated_at FROM orders WHERE picker_id IS NOT NULL ORDER BY updated_at DESC');
    console.log('Picker orders count:', pickerOrders.rows.length);
    console.log('Picker orders:', JSON.stringify(pickerOrders.rows, null, 2));

    console.log('\n=== PICK TASKS ===');
    const pickTasks = await pool.query('SELECT pick_task_id, order_id, picker_id, started_at, completed_at, status FROM pick_tasks WHERE picker_id IS NOT NULL ORDER BY started_at DESC LIMIT 20');
    console.log('Pick tasks count:', pickTasks.rows.length);
    console.log('Pick tasks:', JSON.stringify(pickTasks.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkOrders();