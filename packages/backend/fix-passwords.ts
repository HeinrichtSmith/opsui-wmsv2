import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function fixPasswords() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('Generated hash:', hash);

  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE email IN ($2, $3, $4, $5)',
    [
      hash,
      'john.picker@wms.local',
      'jane.picker@wms.local',
      'bob.packer@wms.local',
      'alice.supervisor@wms.local',
    ]
  );

  console.log('Updated', result.rowCount, 'users');

  await pool.end();
}

fixPasswords().catch(console.error);
