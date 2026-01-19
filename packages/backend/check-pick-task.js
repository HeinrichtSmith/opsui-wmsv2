const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://wms_user:wms_password@localhost:5432/wms_db'
});

async function checkPickTask() {
  try {
    await client.connect();
    
    const pickTaskId = 'PT-QUSIXY5Q';
    
    console.log('Checking for pickTaskId:', pickTaskId);
    console.log('Type:', typeof pickTaskId);
    console.log('Length:', pickTaskId.length);
    
    const result = await client.query(
      'SELECT * FROM pick_tasks WHERE pick_task_id = $1',
      [pickTaskId]
    );
    
    console.log('\nQuery results:');
    console.log('Rows found:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('First row:', JSON.stringify(result.rows[0], null, 2));
    }
    
    // Try a LIKE query
    const likeResult = await client.query(
      "SELECT pick_task_id, status FROM pick_tasks WHERE pick_task_id LIKE $1",
      [`%${pickTaskId}%`]
    );
    
    console.log('\nLIKE query results:');
    console.log('Rows found:', likeResult.rows.length);
    likeResult.rows.forEach(row => {
      console.log('  pick_task_id:', row.pick_task_id, 'status:', row.status);
    });
    
    // Show all pick tasks for this order
    const orderResult = await client.query(
      "SELECT pick_task_id, status FROM pick_tasks WHERE order_id = 'ORD-20260112-2479' ORDER BY pick_task_id"
    );
    
    console.log('\nAll pick tasks for order ORD-20260112-2479:');
    orderResult.rows.forEach(row => {
      console.log('  pick_task_id:', row.pick_task_id, 'status:', row.status);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkPickTask();