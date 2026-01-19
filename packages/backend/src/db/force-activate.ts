/**
 * Force activate all users using pg directly
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function forceActivate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('UPDATE users SET active = true');
    console.log(`Updated ${result.rowCount} users`);

    // Verify
    const checkResult = await client.query('SELECT user_id, name, email, active FROM users');
    console.log('Users after update:', checkResult.rows);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

forceActivate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
