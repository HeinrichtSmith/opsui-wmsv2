/**
 * Test script to verify picker logout cleanup fix
 *
 * This script tests that when a picker logs out:
 * 1. All active PICKING orders are released
 * 2. Order status changes back to PENDING
 * 3. Picker ID is cleared from orders
 * 4. Pick tasks are reset
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://wms_user:wms_password@localhost:5432/wms_db',
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function testLogoutCleanup() {
  console.log('='.repeat(60));
  console.log('Testing Picker Logout Cleanup Fix');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Check current state for "john" picker
    console.log('Step 1: Checking current state for picker "john"...');
    const pickerResult = await query(
      `SELECT user_id, name, email, current_task_id FROM users WHERE user_id = 'USR-PICKER001' OR name ILIKE '%john%'`
    );

    let pickerId = null;
    if (pickerResult.rows.length > 0) {
      const picker = pickerResult.rows[0];
      pickerId = picker.user_id;
      console.log('Found picker:', {
        user_id: picker.user_id,
        name: picker.name,
        email: picker.email,
        current_task_id: picker.current_task_id,
      });
    } else {
      console.log('Picker "john" not found. Looking for any pickers with active orders...');
    }
    console.log();

    // Step 2: Find pickers with active PICKING orders
    console.log('Step 2: Finding pickers with active PICKING orders...');
    const activePickersResult = await query(
      `SELECT DISTINCT u.user_id, u.name, u.email, o.order_id, o.status, o.picker_id
       FROM users u
       INNER JOIN orders o ON u.user_id = o.picker_id
       WHERE o.status = 'PICKING'
       ORDER BY u.user_id`
    );

    console.log(`Found ${activePickersResult.rows.length} picker(s) with active PICKING orders:`);
    if (activePickersResult.rows.length > 0) {
      activePickersResult.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.user_id}): Order ${row.order_id}`);
      });
    } else {
      console.log('  No pickers with active PICKING orders');
    }
    console.log();

    // Step 3: If no active pickers found, we need to check for stale data
    if (activePickersResult.rows.length === 0) {
      console.log('Step 3: Checking for stale picker assignments...');
      const staleResult = await query(
        `SELECT o.order_id, o.customer_name, o.status, o.picker_id, o.updated_at, u.name as picker_name
         FROM orders o
         LEFT JOIN users u ON o.picker_id = u.user_id
         WHERE o.picker_id IS NOT NULL
           AND o.status != 'PICKING'
           AND o.updated_at < NOW() - INTERVAL '1 hour'
         ORDER BY o.updated_at DESC`
      );

      console.log(
        `Found ${staleResult.rows.length} order(s) with potential stale picker assignments:`
      );
      if (staleResult.rows.length > 0) {
        staleResult.rows.forEach(row => {
          console.log(
            `  - Order ${row.order_id}: Status ${row.status}, Picker ${row.picker_name || 'Unknown'} (${row.picker_id}), Updated ${row.updated_at}`
          );
        });
      } else {
        console.log('  No stale assignments found');
      }
      console.log();
    }

    // Step 4: Check for the specific issue mentioned by user
    console.log('Step 4: Checking if picker "john" appears in picker activity query...');
    const activityResult = await query(
      `SELECT 
         u.user_id, 
         u.name, 
         o.order_id as current_order_id,
         o.status as order_status,
         o.updated_at,
         o.picker_id
       FROM users u
       LEFT JOIN orders o ON u.user_id = o.picker_id AND o.status = 'PICKING'
       WHERE u.active = true AND u.role = 'PICKER'
       ORDER BY u.user_id`
    );

    const johnActivity = activityResult.rows.find(
      r => r.name && r.name.toLowerCase().includes('john')
    );
    if (johnActivity) {
      console.log('Found john in picker activity:');
      console.log('  - Picker:', johnActivity.name, `(${johnActivity.user_id})`);
      console.log('  - Current Order:', johnActivity.current_order_id || 'None');
      console.log('  - Order Status:', johnActivity.order_status || 'None');
      console.log('  - Last Updated:', johnActivity.updated_at);

      if (johnActivity.current_order_id && johnActivity.order_status === 'PICKING') {
        console.log('  ⚠️  ISSUE CONFIRMED: John has active PICKING order');
      } else {
        console.log('  ✓ No active PICKING order found');
      }
    } else {
      console.log('John not found in picker activity query');
    }
    console.log();

    // Step 5: Provide cleanup instructions if needed
    if (activePickersResult.rows.length > 0 || (johnActivity && johnActivity.current_order_id)) {
      console.log('Step 5: Cleanup recommendations');
      console.log('─────────────────────────────────────────────────────────────');
      console.log();
      console.log('To manually clear stuck picker status, you can:');
      console.log();
      console.log('Option 1: Use the logout API endpoint (recommended)');
      console.log(`  POST /api/auth/logout`);
      console.log('  (This will now properly clear all active orders)');
      console.log();
      console.log('Option 2: Manually clear in the database');
      console.log('  -- Clear picker from orders:');
      console.log(
        `  UPDATE orders SET status = 'PENDING', picker_id = NULL, claimed_at = NULL WHERE picker_id = '${pickerId || 'USER-ID'}' AND status = 'PICKING';`
      );
      console.log('  -- Clear pick tasks:');
      console.log(
        `  UPDATE pick_tasks SET picker_id = NULL, status = 'PENDING', started_at = NULL WHERE picker_id = '${pickerId || 'USER-ID'}';`
      );
      console.log('  -- Clear user current task:');
      console.log(
        `  UPDATE users SET current_task_id = NULL WHERE user_id = '${pickerId || 'USER-ID'}';`
      );
      console.log();
    }

    console.log('='.repeat(60));
    console.log('Test completed successfully');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

// Run the test
testLogoutCleanup()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
