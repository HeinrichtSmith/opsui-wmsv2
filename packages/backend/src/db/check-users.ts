/**
 * Check users
 */

import { query, closePool } from './client';

async function checkUsers() {
  try {
    const result = await query(`SELECT user_id, name, email, active FROM users`);
    console.log('Users:', result.rows);
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await closePool();
    process.exit(1);
  }
}

checkUsers();
