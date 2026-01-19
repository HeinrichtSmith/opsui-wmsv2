const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function testPickerQueue() {
  try {
    console.log('\n=== Testing Picker Queue Query ===\n');
    
    // This is the query used by the picker queue endpoint
    const result = await pool.query(`
      SELECT 
        o.order_id,
        o.customer_name,
        o.priority,
        o.status,
        o.progress,
        o.created_at,
        COUNT(oi.order_item_id) as item_count,
        COUNT(pt.pick_task_id) as pick_task_count
      FROM orders o
      INNER JOIN order_items oi ON o.order_id = oi.order_id
      INNER JOIN pick_tasks pt ON o.order_id = pt.order_id
      WHERE o.status IN ('PENDING', 'PICKING')
        AND o.progress < 100
      GROUP BY o.order_id, o.customer_name, o.priority, o.status, o.progress, o.created_at
      ORDER BY 
        o.priority DESC,
        o.created_at ASC
    `);
    
    console.log(`Found ${result.rows.length} orders in picker queue:\n`);
    
    let found = false;
    result.rows.forEach((order, i) => {
      console.log(`${i + 1}. ${order.order_id} - ${order.customer_name}`);
      console.log(`   Status: ${order.status} | Priority: ${order.priority}`);
      console.log(`   Progress: ${order.progress}% | Items: ${order.item_count} | Tasks: ${order.pick_task_count}\n`);
      
      if (order.order_id === 'ORD-20260114-5978') {
        found = true;
        console.log('   ✅ THIS IS THE ORDER WE FIXED!\n');
      }
    });
    
    if (!found) {
      console.log('❌ Order ORD-20260114-5978 NOT FOUND in picker queue');
      console.log('This should not happen if all checks passed!\n');
    } else {
      console.log('✅ Order ORD-20260114-5978 is now visible in the picker queue!');
      console.log('The picker should now be able to see this order when they refresh the page.\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testPickerQueue();