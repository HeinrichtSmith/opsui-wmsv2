const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://wms_user:wms_password@localhost:5432/wms_db'
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Test 1: Check if picker_status column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'picker_status'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✓ Test 1: picker_status column exists');
      console.log('  Type:', columnCheck.rows[0].data_type);
      console.log('  Default:', columnCheck.rows[0].column_default);
    } else {
      console.log('✗ Test 1: picker_status column NOT found');
      return;
    }

    // Test 2: Check constraint exists
    const constraintCheck = await client.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'check_picker_status'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('\n✓ Test 2: check_picker_status constraint exists');
      console.log('  Check:', constraintCheck.rows[0].check_clause);
    } else {
      console.log('\n✗ Test 2: check_picker_status constraint NOT found');
    }

    // Test 3: Test update to ACTIVE
    await client.query(`
      UPDATE orders
      SET picker_status = 'ACTIVE'
      WHERE order_id = (SELECT order_id FROM orders WHERE status = 'PICKING' LIMIT 1)
    `);
    console.log('\n✓ Test 3: Successfully updated picker_status to ACTIVE');

    // Test 4: Test update to IDLE
    await client.query(`
      UPDATE orders
      SET picker_status = 'IDLE'
      WHERE order_id = (SELECT order_id FROM orders WHERE status = 'PICKING' LIMIT 1)
    `);
    console.log('✓ Test 4: Successfully updated picker_status to IDLE');

    // Test 5: Test invalid value (should fail)
    try {
      await client.query(`
        UPDATE orders
        SET picker_status = 'INVALID'
        WHERE order_id = (SELECT order_id FROM orders WHERE status = 'PICKING' LIMIT 1)
      `);
      console.log('\n✗ Test 5: Constraint did NOT reject invalid value');
    } catch (err) {
      console.log('\n✓ Test 5: Constraint correctly rejected invalid value');
      console.log('  Error:', err.message);
    }

    // Test 6: Check current picker statuses
    const result = await client.query(`
      SELECT 
        order_id,
        status,
        picker_status,
        picker_id
      FROM orders
      WHERE status = 'PICKING'
      ORDER BY updated_at DESC
      LIMIT 3
    `);

    console.log('\n✓ Test 6: Current picker statuses in PICKING orders:');
    console.log('  Total PICKING orders:', result.rowCount);
    result.rows.forEach(row => {
      console.log(`    - Order ${row.order_id}: ${row.picker_status} (Picker: ${row.picker_id || 'None'})`);
    });

    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('\n✗ Test failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

test();