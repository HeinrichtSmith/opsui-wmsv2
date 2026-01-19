const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function testPickerAPI() {
  try {
    console.log('=== SIMULATING getPickerActivity() ===\n');

    // Step 1: Get all active pickers (filter by role)
    const activePickers = await pool.query(`
      SELECT user_id, name
      FROM users
      WHERE active = true AND role = 'PICKER'
      ORDER BY user_id
    `);

    console.log('Active pickers count:', activePickers.rows.length);
    console.log('Active pickers:', JSON.stringify(activePickers.rows, null, 2));

    if (activePickers.rows.length === 0) {
      return [];
    }

    // Step 2: Build picker activity data - one entry per picker
    const pickerIds = activePickers.rows.map(r => r.user_id);
    console.log('\nPicker IDs:', pickerIds);

    const activityPromises = pickerIds.map(async (pickerId) => {
      console.log(`Processing picker: ${pickerId}`);
      
      // Get most recent PICKING order for this picker
      const activeOrder = await pool.query(`
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1 AND status = 'PICKING'
        ORDER BY updated_at DESC
        LIMIT 1
      `, [pickerId]);

      // Get most recent completed order for this picker
      const recentOrder = await pool.query(`
        SELECT order_id, status, progress, updated_at
        FROM orders
        WHERE picker_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [pickerId]);

      // Get most recent task for this picker
      const recentTask = await pool.query(`
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
    console.log('\nActivity data for each picker:', JSON.stringify(activityData, null, 2));

    // Step 3: Map to response format
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
      }
      else if (data.recentOrder) {
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

      return {
        pickerId: data.pickerId,
        pickerName: activePickers.rows.find(p => p.user_id === data.pickerId)?.name || 'Unknown',
        currentOrderId: status === 'ACTIVE' ? currentOrderId : null,
        orderProgress,
        currentTask,
        lastViewedAt,
        status,
      };
    });

    console.log('\nFinal result to return:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testPickerAPI();