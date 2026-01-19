/**
 * Test script to manually update current_view and verify columns exist
 */

async function testViewUpdate() {
  const { query } = await import('./src/db/client');

  console.log('=== Testing Current View Update ===\n');

  // 1. Check if columns exist
  console.log('1. Checking if current_view columns exist...');
  const columnsResult = await query(`
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'users' 
      AND (column_name LIKE '%current_view%' OR column_name LIKE '%last_view%')
    ORDER BY column_name
  `);

  if (columnsResult.rows.length === 0) {
    console.log('   ❌ NO current_view columns found!');
    console.log('   You need to run: npm run db:migrate');
    return;
  }

  console.log('   ✅ Found columns:');
  columnsResult.rows.forEach(col => {
    console.log(
      `      - ${col.column_name}: ${col.data_type} (${col.is_nullable ? 'NULL' : 'NOT NULL'})`
    );
  });

  // 2. Get current state of pickers
  console.log('\n2. Current picker states:');
  const pickersResult = await query(`
    SELECT 
      user_id,
      email,
      name,
      current_view,
      current_view_updated_at,
      NOW() as server_time
    FROM users
    WHERE role = 'PICKER'
    ORDER BY current_view_updated_at DESC NULLS LAST
  `);

  pickersResult.rows.forEach((picker, index) => {
    console.log(`\n   ${index + 1}. ${picker.email} (${picker.name})`);
    console.log(`      current_view: ${picker.current_view || 'NULL'}`);
    console.log(`      current_view_updated_at: ${picker.current_view_updated_at || 'NULL'}`);
  });

  // 3. Try to update first picker's timestamp
  if (pickersResult.rows.length > 0) {
    const firstPicker = pickersResult.rows[0];
    console.log(`\n3. Attempting to update ${firstPicker.email}'s view...`);

    try {
      const updateResult = await query(
        `
        UPDATE users
        SET current_view = $1,
            current_view_updated_at = NOW()
        WHERE user_id = $2
        RETURNING current_view, current_view_updated_at
      `,
        ['Order Queue (Test)', firstPicker.user_id]
      );

      console.log('   ✅ Update successful!');
      console.log(`      current_view: ${updateResult.rows[0].current_view}`);
      console.log(`      current_view_updated_at: ${updateResult.rows[0].current_view_updated_at}`);

      // Verify it was actually updated
      const verifyResult = await query(
        `
        SELECT 
          current_view,
          current_view_updated_at,
          EXTRACT(EPOCH FROM (NOW() - current_view_updated_at))/60 as seconds_ago
        FROM users
        WHERE user_id = $1
      `,
        [firstPicker.user_id]
      );

      console.log('\n4. Verification:');
      console.log(`   current_view: ${verifyResult.rows[0].current_view}`);
      console.log(`   current_view_updated_at: ${verifyResult.rows[0].current_view_updated_at}`);
      console.log(`   Seconds ago: ${verifyResult.rows[0].seconds_ago.toFixed(2)}s`);
    } catch (error) {
      console.log('   ❌ Update FAILED!');
      console.log(`   Error: ${error.message}`);
      console.log(`   Detail: ${error.detail}`);
    }
  }

  console.log('\n=== Complete ===');
}

testViewUpdate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
