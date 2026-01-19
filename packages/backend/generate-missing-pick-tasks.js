const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

async function generatePickTasks(orderId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log(`\n=== Generating pick tasks for order ${orderId} ===\n`);
    
    // Get order items with name and bin location
    const itemsResult = await client.query(
      `SELECT oi.order_item_id, oi.order_id, oi.sku, oi.name, oi.bin_location, oi.quantity, oi.status 
       FROM order_items oi 
       WHERE oi.order_id = $1 
       ORDER BY oi.order_item_id`,
      [orderId]
    );
    
    if (itemsResult.rows.length === 0) {
      console.log('❌ No items found for this order');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`Found ${itemsResult.rows.length} items:\n`);
    
    for (const item of itemsResult.rows) {
      console.log(`Item ${item.order_item_id}: ${item.sku} - Qty: ${item.quantity} - Status: ${item.status}`);
      
      // Check if pick tasks already exist for this order item
      const existingTasks = await client.query(
        `SELECT COUNT(*) as count FROM pick_tasks WHERE order_id = $1 AND sku = $2`,
        [orderId, item.sku]
      );
      
      const existingCount = parseInt(existingTasks.rows[0].count);
      
      if (existingCount > 0) {
        console.log(`  -> Already has ${existingCount} pick tasks, skipping`);
        continue;
      }
      
      // Generate pick task for each quantity
      for (let i = 0; i < item.quantity; i++) {
        // Generate random 8-character string (matches the generator in shared/utils/generators.ts)
        const randomStr = Math.random().toString(36).substring(2, 10);
        const pickTaskId = `PT-${randomStr}`;
        
        await client.query(
          `INSERT INTO pick_tasks (
            pick_task_id,
            order_id,
            order_item_id,
            sku,
            name,
            target_bin,
            quantity,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, 1, 'PENDING')`,
          [pickTaskId, orderId, item.order_item_id, item.sku, item.name, item.bin_location]
        );
        
        console.log(`  -> Generated pick task: ${pickTaskId}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Pick tasks generated successfully!');
    
    // Verify the tasks were created
    const verifyResult = await client.query(
      `SELECT COUNT(*) as count FROM pick_tasks WHERE order_id = $1`,
      [orderId]
    );
    console.log(`\nTotal pick tasks for order: ${verifyResult.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

const orderId = process.argv[2] || 'ORD-20260114-5978';
generatePickTasks(orderId);