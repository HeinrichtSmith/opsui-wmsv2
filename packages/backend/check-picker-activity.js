const { query } = require('./src/db/client.ts');

(async () => {
  console.log('=== CHECKING PICKER USERS ===');
  const users = await query(
    "SELECT user_id, name, email, role, active FROM users WHERE role = 'PICKER' ORDER BY user_id"
  );
  console.log('Picker users:', JSON.stringify(users.rows, null, 2));

  console.log('\n=== CHECKING ORDERS WITH PICKERS ===');
  const orders = await query(
    'SELECT order_id, picker_id, status, progress, updated_at FROM orders WHERE picker_id IS NOT NULL ORDER BY updated_at DESC LIMIT 10'
  );
  console.log('Orders with pickers:', JSON.stringify(orders.rows, null, 2));

  console.log('\n=== CHECKING PICK TASKS ===');
  const tasks = await query(
    'SELECT pick_task_id, picker_id, order_id, started_at, completed_at, status FROM pick_tasks WHERE picker_id IS NOT NULL ORDER BY started_at DESC LIMIT 10'
  );
  console.log('Pick tasks:', JSON.stringify(tasks.rows, null, 2));

  process.exit(0);
})();
