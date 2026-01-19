const { query } = require('./packages/backend/dist/db/client.js');

(async () => {
  try {
    const result = await query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pick_tasks' ORDER BY ordinal_position"
    );

    console.log('Pick Tasks Columns:');
    result.rows.forEach(col => {
      console.log(`  ${col.columnName || col.column_name}: ${col.dataType || col.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
