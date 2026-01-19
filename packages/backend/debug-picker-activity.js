const { Client } = require('pg');

async function debug() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://wms_user:wms_password@localhost:5432/wms_db'
  });

  try {
    await client.connect();
    console.log('=== Debugging Picker Activity ===\n');

    // Check 1: Active pickers in users table
    const pickers = await client.query(`
      SELECT user_id, name, email, role, active
      FROM users
      WHERE role = 'PICKER' AND active = true
    `);
    
    console.log('Active Pickers:');
    console.log('  Total:', pickers.rowCount);
    pickers.rows.forEach(row => {
      console.log(`    - ${row.name} (${row.user_id}): ${row.email}`);
    });

    // Check 2: Orders with PICKING status
    const pickingOrders = await client.query(`
      SELECT 
        order_id,
        customer_name,
        status,
        picker_id,
        picker_status,
        progress,
        updated_at,
        claimed_at
      FROM orders
      WHERE status = 'PICKING'
      ORDER BY updated_at DESC
    `);
    
    console.log('\nOrders with PICKING status:');
    console.log('  Total:', pickingOrders.rowCount);
    pickingOrders.rows.forEach(row => {
      console.log(`    - ${row.order_id}`);
      console.log(`      Customer: ${row.customer_name}`);
      console.log(`      Picker: ${row.picker_id || 'None'}`);
      console.log(`      Status: ${row.picker_status || 'NULL'}`);
      console.log(`      Progress: ${row.progress}%`);
      console.log(`      Updated: ${row.updated_at}`);
    });

    // Check 3: All orders regardless of status
    const allOrders = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('\nOrder Status Breakdown:');
    allOrders.rows.forEach(row => {
      console.log(`    - ${row.status}: ${row.count}`);
    });

    // Check 4: Test the actual activity query
    console.log('\n=== Testing getPickerActivity Query ===\n');
    const activity = await client.query(`
      WITH active_pickers AS (
        SELECT user_id, name 
        FROM users 
        WHERE role = 'PICKER' AND active = true
      ),
      current_orders AS (
        SELECT DISTINCT ON (picker_id)
          picker_id, 
          order_id,
          progress,
          updated_at,
          picker_status
        FROM orders
        WHERE status = 'PICKING'
        ORDER BY picker_id, updated_at DESC
      )
      SELECT 
        u.user_id as picker_id,
        u.name as picker_name,
        o.order_id as current_order_id,
        COALESCE(o.progress, 0) as order_progress,
        COALESCE(o.picker_status, 'IDLE') as status
      FROM active_pickers u
      LEFT JOIN current_orders o ON u.user_id = o.picker_id
      ORDER BY u.name
    `);

    console.log('Picker Activity Query Result:');
    console.log('  Total rows:', activity.rowCount);
    activity.rows.forEach(row => {
      console.log(`    - ${row.picker_name} (${row.picker_id})`);
      console.log(`      Order: ${row.current_order_id || 'None'}`);
      console.log(`      Progress: ${row.order_progress}%`);
      console.log(`      Status: ${row.status}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

debug();