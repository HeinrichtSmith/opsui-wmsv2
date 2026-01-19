const { query } = require('./src/db/client.js');

(async () => {
  try {
    const result = await query(
      "SELECT user_id, name, email, role, active FROM users WHERE role = 'PICKER' ORDER BY user_id"
    );
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
