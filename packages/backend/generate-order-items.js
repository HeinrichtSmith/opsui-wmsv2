const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'postgres',
  password: 'postgres'
});

// Sample bin locations
const binLocations = ['A-01-01', 'A-01-02', 'B-01-01', 'B-02-01', 'C-01-01', 'C-02-01', 'D-01-01', 'D-02-01'];

async function generateOrderItems() {
  try {
    console.log('Fetching available SKUs from database...');
    const skuResult = await pool.query('SELECT sku, name FROM skus WHERE active = true');
    const availableSKUs = skuResult.rows;
    console.log(`Found ${availableSKUs.length} active SKUs`);
    
    console.log('Finding orders without items...');
    
    // Find orders with no items
    const result = await pool.query(`
      SELECT order_id 
      FROM orders 
      WHERE order_id NOT IN (
        SELECT DISTINCT order_id FROM order_items
      )
      LIMIT 50
    `);
    
    if (result.rows.length === 0) {
      console.log('✓ All orders already have items');
      return;
    }
    
    console.log(`Found ${result.rows.length} orders without items`);
    
    // Generate items for each order
    let totalItems = 0;
    for (const order of result.rows) {
      // Generate 3-8 items per order
      const itemCount = Math.floor(Math.random() * 6) + 3;
      
      console.log(`  Generating ${itemCount} items for ${order.order_id}`);
      
      for (let i = 0; i < itemCount; i++) {
        const randomSKU = availableSKUs[Math.floor(Math.random() * availableSKUs.length)];
        const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
        const binLocation = binLocations[Math.floor(Math.random() * binLocations.length)];
        
        // Generate 9-digit ID (OI + 9 digits = 11 chars max)
        const itemId = 'OI' + Date.now().toString().slice(-8) + i.toString();
        
        await pool.query(`
          INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        `, [itemId, order.order_id, randomSKU.sku, randomSKU.name, quantity, binLocation]);
        
        totalItems++;
      }
    }
    
    console.log(`\n✓ Generated ${totalItems} order items for ${result.rows.length} orders`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

generateOrderItems();