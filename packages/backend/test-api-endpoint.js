const { query } = require('./src/db/client.js');

async function getPickerActivity() {
  try {
    console.log('=== TESTING API ENDPOINT LOGIC ===\n');

    // Step 1: Get all active pickers
    const activePickers = await query(`
      SELECT user_id, name
      FROM users
      WHERE active = true AND role = 'PICKER'
      ORDER BY user_id
    `);

    console.log('Step 1 - Active pickers found:');
    console.log('  Count:', activePickers.rows.length);
    console.log('  PickerIds:', activePickers.rows.map(r => r.user_id));
    console.log('  Pickers:', JSON.stringify(activePickers.rows, null, 2));
    console.log('');

    if (activePickers.rows.length === 0) {
      return [];
    }

    // Step 2: Build picker activity data
    const pickerIds = activePickers.rows.map(r => r.user_id);
    const activityPromises = pickerIds.map(async (pickerId) => {
      const activeOrder = await query(`
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1 AND status = 'PICKING'
        ORDER BY updated_at DESC
        LIMIT 1
      `, [pickerId]);

      const recentOrder = await query(`
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [pickerId]);

      const recentTask = await query(`
        SELECT pick_task_id, started_at, completed_at
        FROM pick_tasks
        WHERE picker_id = $1
        ORDER BY started_at DESC
        LIMIT 1
      `, [pickerId]);

      return {
        pickerId,
        activeOrder: activeOrder.rows.length > 0 ? activeOrder.rows[0] : null,
        recentOrder: recentOrder.rows.length > 0 ? recentOrder.rows[0] : null,
        recentTask: recentTask.rows.length > 0 ? recentTask.rows[0] : null,
      };
    });

    const activityData = await Promise.all(activityPromises);

    // Step 3: Map to response format (as API endpoint does)
    const result = activityData.map((data) => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      let status = 'IDLE';
      let currentOrderId = null;
      let orderProgress = 0;
      let currentTask = null;
      let lastViewedAt = null;

      if (data.activeOrder) {
        status = 'ACTIVE';
        currentOrderId = data.activeOrder.order_id;
        orderProgress = data.activeOrder.progress || 0;
        lastViewedAt = data.activeOrder.updated_at;
      } else if (data.recentOrder) {
        status = 'IDLE';
        currentOrderId = data.recentOrder.order_id;
        orderProgress = data.recentOrder.progress || 0;
        lastViewedAt = data.recentOrder.updated_at;
      }

      if (data.recentTask) {
        const taskStarted = new Date(data.recentTask.started_at);
        if (!lastViewedAt || taskStarted > lastViewedAt) {
          lastViewedAt = data.recentTask.started_at;
        }
        if (taskStarted >= fiveMinutesAgo) {
          status = 'ACTIVE';
          currentTask = data.recentTask.pick_task_id;
        }
      }

      const pickerInfo = activePickers.rows.find(p => p.user_id === data.pickerId);

      return {
        pickerId: data.pickerId,
        pickerName: pickerInfo?.name || 'Unknown',
        currentOrderId: status === 'ACTIVE' ? currentOrderId : null,
        orderProgress,
        currentTask,
        lastViewedAt,
        status,
      };
    });

    console.log('Step 3 - API response format:');
    console.log('  Count:', result.length);
    console.log('  Data:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('=== VERIFYING pickerId IN RESPONSE ===');
    result.forEach((picker, index) => {
      console.log(`Picker ${index + 1}:`);
      console.log('  Has pickerId?', !!picker.pickerId);
      console.log('  pickerId value:', picker.pickerId);
      console.log('  pickerName:', picker.pickerName);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

getPickerActivity();