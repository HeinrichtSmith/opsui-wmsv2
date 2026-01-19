const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function activateSKUs() {
  try {
    console.log('Activating SKUs in database...');

    const skus = ['WMS-001', 'WMS-002', 'WMS-003'];

    for (const sku of skus) {
      // Check if SKU exists
      const result = await pool.query('SELECT sku, active FROM skus WHERE sku = $1', [sku]);

      if (result.rows.length > 0) {
        const currentStatus = result.rows[0].active;
        if (!currentStatus) {
          // Activate SKU
          await pool.query('UPDATE skus SET active = true WHERE sku = $1', [sku]);
          console.log(`✓ Activated SKU: ${sku}`);
        } else {
          console.log(`✓ SKU already active: ${sku}`);
        }
      } else {
        console.log(`✗ SKU not found: ${sku}`);
      }
    }

    console.log('\nSKUs activation complete!');
  } catch (error) {
    console.error('Error activating SKUs:', error.message);
  } finally {
    await pool.end();
  }
}

activateSKUs();
