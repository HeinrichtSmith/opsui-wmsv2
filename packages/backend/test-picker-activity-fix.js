/**
 * Test script to verify picker activity tracking fixes
 *
 * This tests:
 * 1. current_view and current_view_updated_at are being updated
 * 2. Order queue view is properly detected
 * 3. IN/OUT of WINDOW status is calculated correctly
 */

const { query } = require('./src/db/client');

async function testPickerActivity() {
  console.log('=== Testing Picker Activity Tracking ===\n');

  try {
    // Get all pickers
    const pickersResult = await query(`
      SELECT 
        user_id,
        email,
        role,
        current_view,
        current_view_updated_at,
        NOW() as server_time,
        EXTRACT(EPOCH FROM (NOW() - current_view_updated_at)) / 60 as minutes_since_update
      FROM users
      WHERE role = 'PICKER'
      ORDER BY current_view_updated_at DESC NULLS LAST
    `);

    console.log('=Ê Picker Status Summary:');
    console.log('=====================================\n');

    pickersResult.rows.forEach(picker => {
      console.log(`=d Picker: ${picker.email}`);
      console.log(`   Current View: ${picker.current_view || 'NULL'}`);
      console.log(`   Last Update: ${picker.current_view_updated_at || 'NEVER'}`);
      console.log(`   Minutes Ago: ${picker.minutes_since_update ? picker.minutes_since_update.toFixed(1) : 'NEVER'}`);
      
      // Determine IN/OUT of WINDOW status
      const isOrderQueue = picker.current_view === '/orders' || 
                         picker.current_view === '/orders/' || 
                         picker.current_view === 'Order Queue';
      
      const recentActivity = picker.minutes_since_update !== null && picker.minutes_since_update <= 5;
      
      let windowStatus = 'UNKNOWN';
      if (isOrderQueue && recentActivity) {
        windowStatus = ' IN WINDOW (Order Queue)';
      } else if (isOrderQueue) {
        windowStatus = '   IN WINDOW but STALE (>5 min)';
      } else {
        windowStatus = 'L OUT OF WINDOW';
      }
      
      console.log(`   Status: ${windowStatus}`);
      console.log('');
    });

    // Check for pickers with stale data
    const stalePickers = pickersResult.rows.filter(p => 
      p.minutes_since_update === null || p.minutes_since_update > 10
    );

    if (stalePickers.length > 0) {
      console.log('   Pickers with stale data (>10 minutes):');
      console.log('=====================================\n');
      stalePickers.forEach(picker => {
        console.log(`   ${picker.email} - ${picker.minutes_since_update ? picker.minutes_since_update.toFixed(0) + ' min' : 'NEVER'} ago`);
      });
      console.log('');
    }

    // Check orders for these pickers
    console.log('=æ Current Orders for Pickers:');
    console.log('=====================================\n');

    const ordersResult = await query(`
      SELECT 
        o.order_id,
        o.status as order_status,
        o.picker_id,
        u.email as picker_email,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON o.picker_id = u.user_id
      WHERE o.status IN ('PICKING', 'IN_PROGRESS')
        AND o.picker_id IS NOT NULL
      ORDER BY o.updated_at DESC
    `);

    if (ordersResult.rows.length > 0) {
      ordersResult.rows.forEach(order => {
        console.log(`   Order: ${order.order_id}`);
        console.log(`   Status: ${order.order_status}`);
        console.log(`   Picker: ${order.picker_email}`);
        console.log(`   Last Update: ${order.updated_at}`);
        console.log('');
      });
    } else {
      console.log('   No active orders in progress\n');
    }

    console.log('=== Test Complete ===\n');
    console.log('Expected Behavior:');
    console.log('- Pickers on Order Queue should have current_view = "/orders" or similar');
    console.log('- current_view_updated_at should be recent (<5 min if actively using)');
    console.log('- Status should be "IN WINDOW" if view = Order Queue AND timestamp recent');
    console.log('- Status should be "OUT OF WINDOW" if view ` Order Queue OR timestamp stale');

  } catch (error) {
    console.error('Error testing picker activity:', error);
    process.exit(1);
  }
}

// Run test
testPickerActivity()
  .then(() => {
    console.log('\n Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nL Test failed:', error);
    process.exit(1);
  });