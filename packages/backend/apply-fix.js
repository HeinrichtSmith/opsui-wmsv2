const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function applyFix() {
  console.log('Applying fix for duplicate state change IDs...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fix state change ID generation
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_state_change_id()
      RETURNS VARCHAR(50) AS $$
        SELECT 'OSC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 12, '0');
      $$ LANGUAGE SQL;
    `);

    // Fix transaction ID generation
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_transaction_id()
      RETURNS VARCHAR(50) AS $$
        SELECT 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 12, '0');
      $$ LANGUAGE SQL;
    `);

    await client.query('COMMIT');
    console.log('✓ Fix applied successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Error applying fix:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyFix()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });
