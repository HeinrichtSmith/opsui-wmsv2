const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function createTestData() {
  try {
    console.log('=== Creating Test Data ===\n');

    // 1. Check and create SKUs with all required fields
    console.log('1. Checking SKUs...');
    const skusResult = await pool.query('SELECT COUNT(*) as count FROM skus');
    const skuCount = parseInt(skusResult.rows[0].count);
    console.log('   Current SKUs:', skuCount);

    if (skuCount === 0) {
      console.log('   Creating SKUs...');
      const skus = [
        { sku: 'WMS-001', name: 'Widget A', category: 'Electronics', description: 'Test widget A' },
        { sku: 'WMS-002', name: 'Widget B', category: 'Electronics', description: 'Test widget B' },
        { sku: 'WMS-003', name: 'Widget C', category: 'Electronics', description: 'Test widget C' },
      ];

      for (const item of skus) {
        await pool.query(
          `INSERT INTO skus (sku, name, category, description, active) 
           VALUES ($1, $2, $3, $4, $5)`,
          [item.sku, item.name, item.category, item.description, true]
        );
        console.log('   Created:', item.sku, '-', item.name);
      }
    } else {
      console.log('   SKUs already exist');
    }

    // 2. Delete existing test order and items
    console.log('\n2. Cleaning up existing test order...');
    await pool.query('DELETE FROM pick_tasks WHERE order_id = $1', ['ORD-20260114-0001']);
    await pool.query('DELETE FROM order_items WHERE order_id = $1', ['ORD-20260114-0001']);
    await pool.query('DELETE FROM orders WHERE order_id = $1', ['ORD-20260114-0001']);
    console.log('   Cleaned up');

    // 3. Create a new order
    console.log('\n3. Creating new order...');
    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`;
    console.log('   Order ID:', orderId);

    await pool.query(
      `INSERT INTO orders (order_id, customer_id, customer_name, priority, status, progress) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, 'CUST000001', 'Test Customer', 'HIGH', 'PENDING', 0]
    );
    console.log('   Order created');

    // 4. Add order items
    console.log('\n4. Adding order items...');
    const itemsToAdd = await pool.query('SELECT sku, name FROM skus LIMIT 3');
    console.log('   Found', itemsToAdd.rows.length, 'SKUs to add');

    // Temporarily disable trigger
    await pool.query('DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items');

    for (let i = 0; i < itemsToAdd.rows.length; i++) {
      const sku = itemsToAdd.rows[i];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const itemId = `OI-${orderId.replace(/-/g, '')}-${i}`;

      await pool.query(
        `INSERT INTO order_items (order_item_id, order_id, sku, name, quantity, bin_location) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, orderId, sku.sku, sku.name, quantity, `A-01-0${i + 1}`]
      );

      console.log(`   Added: ${sku.sku} - ${sku.name} x ${quantity}`);
    }

    // Re-create trigger
    await pool.query(`
      CREATE TRIGGER trigger_update_order_progress
      AFTER INSERT OR UPDATE ON order_items
      FOR EACH ROW
      EXECUTE FUNCTION update_order_progress()
    `);

    // 5. Verify data
    console.log('\n5. Verifying data...');
    const orderCount = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE order_id = $1',
      [orderId]
    );
    const itemCount = await pool.query(
      'SELECT COUNT(*) as count FROM order_items WHERE order_id = $1',
      [orderId]
    );
    const pickTaskCount = await pool.query(
      'SELECT COUNT(*) as count FROM pick_tasks WHERE order_id = $1',
      [orderId]
    );

    console.log('   Orders:', orderCount.rows[0].count);
    console.log('   Order Items:', itemCount.rows[0].count);
    console.log('   Pick Tasks:', pickTaskCount.rows[0].count);

    // 6. Display order details
    console.log('\n6. Order Details:');
    const orderDetails = await pool.query(
      `SELECT o.order_id, o.status, o.progress, 
              COUNT(oi.order_item_id) as item_count,
              SUM(oi.quantity) as total_quantity
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.order_id = $1
       GROUP BY o.order_id, o.status, o.progress`,
      [orderId]
    );

    if (orderDetails.rows.length > 0) {
      console.log('   Order:', orderDetails.rows[0].order_id);
      console.log('   Status:', orderDetails.rows[0].status);
      console.log('   Items:', orderDetails.rows[0].item_count);
      console.log('   Total Quantity:', orderDetails.rows[0].total_quantity);
    }

    console.log('\n=== Test Data Created Successfully ===');
    console.log('\nNext Steps:');
    console.log('1. Refresh your picker page at http://localhost:5173');
    console.log('2. You should now see the order with items');
    console.log('3. Click on the order to claim it');
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestData();
