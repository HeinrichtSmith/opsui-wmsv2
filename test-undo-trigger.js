const { query } = require('./packages/backend/dist/db/client.js');

(async () => {
  try {
    console.log('Testing undo pick trigger behavior...\n');

    // Find a PICKING order with a completed pick task
    const orderResult = await query(
      `SELECT order_id, status, progress 
       FROM orders 
       WHERE status = 'PICKING' 
       LIMIT 1`
    );

    if (orderResult.rows.length === 0) {
      console.log('No PICKING orders found');
      process.exit(0);
    }

    const order = orderResult.rows[0];
    const orderId = order.order_id || order.orderId;
    const beforeProgress = parseInt(order.progress, 10);

    console.log(`Testing with order: ${orderId}`);
    console.log(`Initial progress: ${beforeProgress}%\n`);

    // Get a completed pick task
    const pickTaskResult = await query(
      `SELECT pick_task_id, order_item_id, picked_quantity, quantity, status 
       FROM pick_tasks 
       WHERE order_id = $1 AND status = 'COMPLETED' 
       LIMIT 1`,
      [orderId]
    );

    if (pickTaskResult.rows.length === 0) {
      console.log('No completed pick tasks found to undo');
      process.exit(0);
    }

    const pickTask = pickTaskResult.rows[0];
    const orderItemId = pickTask.order_item_id;

    console.log('Pick task before undo:', {
      pick_task_id: pickTask.pick_task_id,
      order_item_id: pickTask.order_item_id,
      picked_quantity: pickTask.picked_quantity,
      quantity: pickTask.quantity,
      status: pickTask.status,
    });

    // Check order_items state before undo
    const orderItemBefore = await query(
      `SELECT order_item_id, picked_quantity, status 
       FROM order_items 
       WHERE order_item_id = $1`,
      [orderItemId]
    );

    console.log('Order item before undo:', orderItemBefore.rows[0]);

    // Simulate undo: decrement picked_quantity
    const newPickedQuantity = Math.max(0, pickTask.picked_quantity - 1);

    console.log(
      `\nDecrementing picked_quantity from ${pickTask.picked_quantity} to ${newPickedQuantity}`
    );

    // Update order_items (this should trigger progress recalculation)
    const itemStatus =
      newPickedQuantity >= pickTask.quantity
        ? 'FULLY_PICKED'
        : newPickedQuantity > 0
          ? 'PARTIAL_PICKED'
          : 'PENDING';

    const updateResult = await query(
      `UPDATE order_items
         SET picked_quantity = $1,
             status = $2::order_item_status
         WHERE order_item_id = $3
         RETURNING order_item_id, picked_quantity, status`,
      [newPickedQuantity, itemStatus, orderItemId]
    );

    console.log('Order item updated:', updateResult.rows[0]);

    // Check if order.progress changed
    const orderAfter = await query(`SELECT order_id, progress FROM orders WHERE order_id = $1`, [
      orderId,
    ]);

    const afterProgress = parseInt(orderAfter.rows[0].progress, 10);

    console.log(`\n=== Results ===`);
    console.log(`Before progress: ${beforeProgress}%`);
    console.log(`After progress: ${afterProgress}%`);
    console.log(`Progress changed: ${beforeProgress !== afterProgress ? 'YES ✓' : 'NO ✗'}`);

    if (beforeProgress === afterProgress) {
      console.log('\n❌ TRIGGER DID NOT FIRE - progress did not change!');
      console.log(
        'This means the update_order_progress trigger on order_items is not working correctly.'
      );
    } else {
      console.log(`\n✓ Trigger fired! Progress changed by ${afterProgress - beforeProgress}%`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
