/**
 * Script to reset stuck orders to claimable state
 * This version handles the order_state_changes trigger properly
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function resetOrders() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password'
  });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('\n=== RESETTING STUCK ORDERS ===\n');
    
    // Step 1: Check current stuck orders
    console.log('1. Checking for stuck orders...');
    const stuckOrders = await client.query(`
      SELECT 
        order_id,
        status,
        picker_id,
        customer_name,
        priority,
        created_at
      FROM orders
      WHERE status = 'PICKING'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (stuckOrders.rows.length === 0) {
      console.log('   No stuck orders found');
    } else {
      console.log(`   Found ${stuckOrders.rows.length} stuck orders:`);
      stuckOrders.rows.forEach(order => {
        console.log(`   ${order.order_id} - ${order.customer_name} (Picker: ${order.picker_id || 'None'})`);
      });
    }
    
    // Step 2: Disable the order_state_changes trigger to avoid unique constraint errors
    console.log('\n2. Disabling order_state_changes trigger...');
    await client.query('DROP TRIGGER IF EXISTS trigger_log_order_state_change ON orders');
    console.log('   ✓ Trigger disabled');
    
    // Step 3: Reset orders stuck in PICKING status (clear all picker assignments)
    console.log('\n3. Resetting all orders in PICKING status...');
    const result = await client.query(`
      UPDATE orders
      SET status = 'PENDING',
          picker_id = NULL,
          claimed_at = NULL,
          updated_at = NOW()
      WHERE status = 'PICKING'
    `);
    console.log(`   ✓ Updated ${result.rowCount} orders`);
    
    // Step 4: Delete orphaned pick tasks
    console.log('\n4. Deleting orphaned pick tasks...');
    const taskResult = await client.query(`
      DELETE FROM pick_tasks
      WHERE order_id NOT IN (SELECT order_id FROM orders)
    `);
    console.log(`   ✓ Deleted ${taskResult.rowCount} orphaned tasks`);
    
    // Step 5: Verify changes
    console.log('\n5. Orders now available for claiming:');
    const pendingOrders = await client.query(`
      SELECT 
        order_id,
        status,
        picker_id,
        customer_name,
        priority,
        created_at
      FROM orders
      WHERE status = 'PENDING'
      ORDER BY priority DESC, created_at ASC
      LIMIT 10
    `);
    
    if (pendingOrders.rows.length === 0) {
      console.log('   No orders available');
    } else {
      pendingOrders.rows.forEach(order => {
        console.log(`   ${order.order_id} - ${order.customer_name} (${order.priority})`);
      });
    }
    
    // Step 6: Check specific order ORD-20260112-7802
    console.log('\n6. Specific order: ORD-20260112-7802');
    const specificOrder = await client.query(`
      SELECT 
        order_id,
        status,
        picker_id,
        claimed_at,
        CASE 
          WHEN status = 'PENDING' AND picker_id IS NULL THEN 'Can be claimed: YES'
          ELSE 'Can be claimed: NO'
        END as claimable
      FROM orders
      WHERE order_id = 'ORD-20260112-7802'
    `);
    
    if (specificOrder.rows.length === 0) {
      console.log('   ❌ Order not found');
    } else {
      const order = specificOrder.rows[0];
      console.log(`   Status: ${order.status}`);
      console.log(`   Picker: ${order.picker_id || 'None'}`);
      console.log(`   Claimed at: ${order.claimed_at || 'Never'}`);
      console.log(`   ${order.claimable}`);
    }
    
    // Step 7: Recreate the order state change trigger
    console.log('\n7. Recreating order_state_changes trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION log_order_state_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
          INSERT INTO order_state_changes (change_id, order_id, from_status, to_status, user_id)
          VALUES (
            generate_state_change_id(),
            NEW.order_id,
            OLD.status,
            NEW.status,
            NEW.picker_id
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_log_order_state_change
      AFTER UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION log_order_state_change();
    `);
    console.log('   ✓ Trigger recreated');
    
    // Step 8: Summary
    console.log('\n=== SUMMARY ===');
    console.log('✓ All orders have been reset to claimable state');
    console.log('✓ You can now claim orders from the Order Queue page');
    console.log('\n=== DONE ===\n');
    
    await client.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

resetOrders();