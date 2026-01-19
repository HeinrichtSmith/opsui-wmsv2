const { query } = require('./packages/backend/dist/db/client.js');

(async () => {
  try {
    console.log('Fixing NULL picked_quantity values in pick_tasks...\n');

    // Check for NULL values
    const nullCheck = await query(`SELECT COUNT(*) FROM pick_tasks WHERE picked_quantity IS NULL`);

    const nullCount = parseInt(nullCheck.rows[0].count, 10);
    console.log(`Found ${nullCount} rows with NULL picked_quantity`);

    if (nullCount > 0) {
      // Update NULL values to 0
      const result = await query(
        `UPDATE pick_tasks SET picked_quantity = 0 WHERE picked_quantity IS NULL`
      );

      console.log(`Updated ${result.rowCount} rows`);
    }

    // Verify the fix
    const verifyResult = await query(
      `SELECT pick_task_id, sku, quantity, picked_quantity FROM pick_tasks WHERE picked_quantity IS NULL LIMIT 5`
    );

    if (verifyResult.rows.length > 0) {
      console.log('\nERROR: Still have NULL values after fix!');
      verifyResult.rows.forEach(row => {
        console.log(`  ${row.pick_task_id}: ${row.sku} - picked_quantity is still NULL`);
      });
    } else {
      console.log('\n✓ All picked_quantity values are now 0 or greater');
    }

    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
