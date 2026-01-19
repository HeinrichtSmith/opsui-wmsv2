const { query } = require('./dist/db/client.js');

(async () => {
  try {
    // Check USR-PICK01 orders
    console.log('=== USR-PICK01 Orders ===');
    const orders = await query(
      `
      SELECT order_id, status, progress, picker_id 
      FROM orders 
      WHERE picker_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 5
    `,
      ['USR-PICK01']
    );
    console.log('Orders:', JSON.stringify(orders.rows, null, 2));

    // Check USR-PICK01 user data
    console.log('\n=== USR-PICK01 User ===');
    const user = await query(
      `
      SELECT user_id, name, current_view, current_view_updated_at
      FROM users 
      WHERE user_id = $1
    `,
      ['USR-PICK01']
    );
    console.log('User:', JSON.stringify(user.rows[0], null, 2));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
