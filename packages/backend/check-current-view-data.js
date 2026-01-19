const { query } = require('./dist/db/client');

async function checkCurrentView() {
  try {
    // Get all active pickers with their current_view data
    const result = await query(`
      SELECT user_id, name, role, active, 
             current_view, current_view_updated_at, 
             last_login_at
      FROM users
      WHERE active = true AND role = 'PICKER'
      ORDER BY user_id
    `);

    console.log('Active pickers and their current_view:');
    console.log('Total pickers:', result.rows.length);
    console.log(JSON.stringify(result.rows, null, 2));

    // Also check for any orders they might be picking
    for (const picker of result.rows) {
      const ordersResult = await query(
        `
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1 AND status = 'PICKING'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
        [picker.user_id]
      );

      if (ordersResult.rows.length > 0) {
        console.log(`\nPicker ${picker.name} has PICKING order:`, ordersResult.rows[0]);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkCurrentView();
