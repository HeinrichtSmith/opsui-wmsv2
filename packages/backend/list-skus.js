const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function listSKUs() {
  try {
    const result = await pool.query('SELECT sku, name, barcode, active FROM skus ORDER BY sku');

    console.log('SKUs in database:');
    console.log('------------------');

    if (result.rows.length === 0) {
      console.log('No SKUs found!');
    } else {
      result.rows.forEach(row => {
        console.log(`${row.sku} | ${row.name} | ${row.barcode} | active: ${row.active}`);
      });
    }
  } catch (error) {
    console.error('Error listing SKUs:', error.message);
  } finally {
    await pool.end();
  }
}

listSKUs();
