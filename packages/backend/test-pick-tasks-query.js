/**
 * Test the actual query used in OrderRepository
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password'
});

async function testQuery() {
  const client = await pool.connect();

  try {
    const orderId = 'ORD-20260114-6062';

    console.log(`=== Testing pick_tasks query for order ${orderId} ===\n`);

    // Test 1: Check if order exists
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    );
    console.log('Order exists:', orderResult.rows.length > 0);
    console.log('Order status:', orderResult.rows[0]?.status);

    // Test 2: Check pick_tasks directly
    const pickTasksDirect = await client.query(
      'SELECT * FROM pick_tasks WHERE order_id = $1',
      [orderId]
    );
    console.log('\nPick tasks (direct query):', pickTasksDirect.rows.length);
    console.log('First pick task:', JSON.stringify(pickTasksDirect.rows[0], null, 2));

    // Test 3: Check the JOIN query (same as in OrderRepository)
    const joinQuery = `
      SELECT pt.pick_task_id as order_item_id, pt.order_id, pt.sku, pt.name, s.barcode,
             pt.target_bin as bin_location, pt.quantity, pt.picked_quantity as picked_quantity,
             0 as verified_quantity, pt.status, pt.completed_at
      FROM pick_tasks pt
      LEFT JOIN skus s ON pt.sku = s.sku
      WHERE pt.order_id = $1
      ORDER BY pt.pick_task_id ASC
    `;

    const joinResult = await client.query(joinQuery, [orderId]);
    console.log('\nPick tasks (JOIN query):', joinResult.rows.length);
    console.log('First result:', JSON.stringify(joinResult.rows[0], null, 2));

    // Test 4: Check if SKUs table has the items
    const skuResult = await client.query(
      'SELECT sku, barcode FROM skus WHERE sku IN (SELECT DISTINCT sku FROM pick_tasks WHERE order_id = $1)',
      [orderId]
    );
    console.log('\nSKUs found:', skuResult.rows.length);
    console.log('SKUs:', JSON.stringify(skuResult.rows, null, 2));

    // Test 5: Check what the API endpoint would return
    console.log('\n=== Simulating API call ===');
    const { getOrderQueue } = require('./dist/repositories/OrderRepository');
    const result = await getOrderQueue({ status: 'PICKING', pickerId: 'USR-PICK01' });
    console.log('Orders returned:', result.orders.length);
    if (result.orders.length > 0) {
      console.log('First order:', result.orders[0].orderId);
      console.log('First order items:', result.orders[0].items?.length || 0);
      if (result.orders[0].items && result.orders[0].items.length > 0) {
        console.log('First item:', JSON.stringify(result.orders[0].items[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testQuery();
