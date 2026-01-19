import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function fixAdminPassword() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated hash:', hash);

  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE email = $2',
    [hash, 'admin@wms.local']
  );

  console.log('Updated', result.rowCount, 'admin user');

  await pool.end();
}

fixAdminPassword().catch(console.error);
