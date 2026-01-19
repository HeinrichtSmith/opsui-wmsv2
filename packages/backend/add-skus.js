const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function addSKUs() {
  try {
    console.log('Adding SKUs to database...');
    
    const skus = [
      { sku: 'WMS-001', name: 'Widget A', barcode: '1234567890123', price: 19.99, quantity: 100 },
      { sku: 'WMS-002', name: 'Widget B', barcode: '2345678901234', price: 29.99, quantity: 75 },
      { sku: 'WMS-003', name: 'Widget C', barcode: '3456789012345', price: 39.99, quantity: 50 },
    ];

    for (const item of skus) {
      // Check if SKU exists
      const exists = await pool.query(
        'SELECT sku FROM skus WHERE sku = $1',
        [item.sku]
      );

      if (exists.rows.length === 0) {
        // Insert new SKU
        await pool.query(
          `INSERT INTO skus (sku, name, barcode, price, quantity, active) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [item.sku, item.name, item.barcode, item.price, item.quantity, true]
        );
        console.log(`✓ Created SKU: ${item.sku} - ${item.name}`);
      } else {
        console.log(`✓ SKU already exists: ${item.sku}`);
      }
    }

    console.log('\nSKUs added successfully!');
  } catch (error) {
    console.error('Error adding SKUs:', error.message);
  } finally {
    await pool.end();
  }
}

addSKUs();