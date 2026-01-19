const { query } = require('./dist/db/client');

async function checkUsersTable() {
  console.log('=== Checking Users Table Structure ===\n');

  // Get column info
  const columns = await query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);

  console.log('Columns:');
  console.table(columns.rows);

  console.log('\n=== Sample User Data ===\n');

  // Get sample data
  const users = await query(`
    SELECT *
    FROM users
    WHERE role = 'PICKER'
    LIMIT 2
  `);

  console.log('Raw user data:');
  console.log(JSON.stringify(users.rows, null, 2));

  console.log('\n=== Specific User Check ===\n');

  // Check specific user
  const user = await query(`
    SELECT user_id, name, current_view, current_view_updated_at
    FROM users
    WHERE user_id = $1
  `, ['USR-PICK01']);

  console.log('John Picker data:');
  console.log(JSON.stringify(user.rows[0] || 'Not found', null, 2));

  process.exit(0);
}

checkUsersTable().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});