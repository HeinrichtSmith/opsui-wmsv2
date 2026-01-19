const { query } = require('./packages/backend/dist/db/client.js');

(async () => {
  try {
    console.log('Debugging undo pick and trigger...\n');
    
    // Find a PICKING order with items
    const orderResult = await query(
      `SELECT order_id FROM orders WHERE status = 'PICKING' LIMIT 1`
    );
    
    if (orderResult.rows.length === 0) {
      console.log('No PICKING orders found');
      process.exit(0);
    }
    
    const order = orderResult.rows[0];
    const orderId = order.order_id || order.orderId;
    
    console.log(`Testing with order: ${orderId}\n`);
    
    // Check order_items before undo
    const itemsBefore = await query(
      `SELECT order_item_id, quantity, picked_quantity 
       FROM order_items 
       WHERE order_id = $1`,
      [orderId]
    );
    
    console.log('Order items BEFORE:');
    itemsBefore.rows.forEach(item => {
      console.log(`  ${item.order_item_id}: picked=${item.picked_quantity}/${item.quantity}`);
    });
    
    // Check order progress before
    const orderBefore = await query(
      `SELECT progress FROM orders WHERE order_id = $1`,
      [orderId]
    );
    console.log(`\nOrder progress BEFORE: ${orderBefore.rows[0].progress}%`);
    
    // Calculate what progress SHOULD be based on current state
    const calcProgress = Math.round(
      itemsBefore.rows.reduce((sum, item) => {
        return sum + (item.picked_quantity / item.quantity * 100);
      }, 0) / itemsBefore.rows.length
    );
    console.log(`Calculated progress from items: ${calcProgress}%`);
    
    // Now test: set first item's picked_quantity to 0
    if (itemsBefore.rows.length > 0) {
      const orderItemId = itemsBefore.rows[0].order_item_id;
      console.log(`\n=== UNDO: Setting order_item ${orderItemId} picked_quantity to 0 ===`);
      
      await query(
        `UPDATE order_items
         SET picked_quantity = 0
         WHERE order_item_id = $1
         RETURNING order_item_id, picked_quantity`,
        [orderItemId]
      );
      
      // Check order items after update
      const itemsAfter = await query(
        `SELECT order_item_id, quantity, picked_quantity 
         FROM order_items 
         WHERE order_id = $1`,
        [orderId]
      );
      
      console.log('\nOrder items AFTER update:');
      itemsAfter.rows.forEach(item => {
        console.log(`  ${item.order_item_id}: picked=${item.picked_quantity}/${item.quantity}`);
      });
      
      // Check order progress after (trigger should have fired)
      const orderAfter = await query(
        `SELECT progress FROM orders WHERE order_id = $1`,
        [orderId]
      );
      console.log(`\nOrder progress AFTER: ${orderAfter.rows[0].progress}%`);
      
      // Calculate what progress SHOULD be after
      const calcProgressAfter = Math.round(
        itemsAfter.rows.reduce((sum, item) => {
          return sum + (item.picked_quantity / item.quantity * 100);
        }, 0) / itemsAfter.rows.length
      );
      console.log(`Calculated progress from items: ${calcProgressAfter}%`);
      
      console.log(`\n=== RESULT ===`);
      console.log(`Progress changed: ${orderBefore.rows[0].progress !== orderAfter.rows[0].progress ? 'YES' : 'NO'}`);
      
      if (orderBefore.rows[0].progress === orderAfter.rows[0].progress) {
        console.log('❌ TRIGGER DID NOT FIRE - progress did not change!');
      } else {
        console.log(`✓ Trigger fired! Progress changed from ${orderBefore.rows[0].progress}% to ${orderAfter.rows[0].progress}%`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();