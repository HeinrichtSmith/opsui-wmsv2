const { query } = require('./dist/db/client');

async function applyMigration() {
  try {
    console.log('Applying current_view columns migration...');

    // Check if columns already exist
    const checkResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('current_view', 'current_view_updated_at')
    `);

    const existingColumns = checkResult.rows.map(r => r.column_name);
    console.log('Existing columns:', existingColumns);

    // Add current_view column if not exists
    if (!existingColumns.includes('current_view')) {
      console.log('Adding current_view column...');
      await query(`ALTER TABLE users ADD COLUMN current_view VARCHAR(50)`);
      console.log('✓ Added current_view column');
    } else {
      console.log('✓ current_view column already exists');
    }

    // Add current_view_updated_at column if not exists
    if (!existingColumns.includes('current_view_updated_at')) {
      console.log('Adding current_view_updated_at column...');
      await query(`ALTER TABLE users ADD COLUMN current_view_updated_at TIMESTAMP`);
      console.log('✓ Added current_view_updated_at column');
    } else {
      console.log('✓ current_view_updated_at column already exists');
    }

    // Verify
    const verifyResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('current_view', 'current_view_updated_at')
      ORDER BY ordinal_position
    `);

    console.log('\nVerification:');
    console.log(JSON.stringify(verifyResult.rows, null, 2));

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

applyMigration();
