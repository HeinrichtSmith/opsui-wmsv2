/**
 * Add barcode column to SKUs and assign barcodes
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password'
});

async function addBarcodes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add barcode column if it doesn't exist
    console.log('Adding barcode column to skus table...');
    await client.query(`
      ALTER TABLE skus
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(50) UNIQUE
    `);

    // Assign barcodes to SKUs
    console.log('\nAssigning barcodes to SKUs...');
    
    const updates = [
      { sku: 'WMS-001', barcode: '100001', name: 'Widget A' },
      { sku: 'WMS-002', barcode: '100002', name: 'Widget B' },
      { sku: 'WMS-003', barcode: '100003', name: 'Widget C' }
    ];

    for (const item of updates) {
      await client.query(
        'UPDATE skus SET barcode = $1 WHERE sku = $2',
        [item.barcode, item.sku]
      );
      console.log(`  ✓ ${item.sku} (${item.name}) -> ${item.barcode}`);
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Barcodes assigned successfully!');
    
    // Verify
    const res = await client.query('SELECT sku, name, barcode FROM skus WHERE active = true ORDER BY sku');
    console.log('\nUpdated SKUs:');
    res.rows.forEach(row => {
      console.log(`  ${row.sku} - ${row.name} - Barcode: ${row.barcode}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addBarcodes().catch(console.error);