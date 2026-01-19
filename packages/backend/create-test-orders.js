const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function createTestOrders() {
  try {
    console.log('Creating test orders...');

    // Check if orders already exist
    const existingOrders = await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'PENDING'");

    const pendingCount = parseInt(existingOrders.rows[0].count, 10);
    if (pendingCount > 0) {
      console.log(`✓ Found ${pendingCount} existing PENDING orders`);
      return;
    }

    // Create 5 test orders
    for (let i = 1; i <= 5; i++) {
      const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i).padStart(4, '0')}`;

      const priorities = ['HIGH', 'MEDIUM', 'LOW'];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];

      const customers = [
        'John Smith',
        'Jane Doe',
        'Bob Johnson',
        'Alice Williams',
        'Charlie Brown',
      ];
      const customerName = customers[i - 1] || `Customer ${i}`;

      await pool.query(
        `
        INSERT INTO orders (order_id, customer_id, customer_name, priority, status, progress, created_at)
        VALUES ($1, $2, $3, $4, 'PENDING', 0, NOW())
      `,
        [orderId, `CUST-${String(i).padStart(6, '0')}`, customerName, priority]
      );

      console.log(`✓ Created order: ${orderId} (${priority} priority)`);

      // Add 3-5 items per order
      const itemCount = Math.floor(Math.random() * 3) + 3;

      // Get random SKUs
      const skuResult = await pool.query(
        'SELECT sku, name, bin_locations[1] as bin_location FROM skus WHERE active = true ORDER BY RANDOM() LIMIT $1',
        [itemCount]
      );

      for (let j = 0; j < skuResult.rows.length; j++) {
        const sku = skuResult.rows[j];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        const itemId = `OI-${orderId.slice(-10)}-${j}`;

        await pool.query(
          `
          INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        `,
          [itemId, orderId, sku.sku, sku.name, quantity, sku.bin_location]
        );
      }

      console.log(`  └─ Added ${skuResult.rows.length} items`);
    }

    // Verify
    const verifyResult = await pool.query("SELECT COUNT(*) FROM orders WHERE status = 'PENDING'");
    const totalPending = parseInt(verifyResult.rows[0].count, 10);

    console.log(`\n✓ Successfully created ${totalPending} PENDING orders`);
    console.log('✓ Orders are now available for pickers to claim');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

createTestOrders();
