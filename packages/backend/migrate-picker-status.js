const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://wms_user:wms_password@localhost:5432/wms_db'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add column if not exists
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS picker_status VARCHAR(10) DEFAULT 'IDLE'
    `);
    console.log('✓ Added picker_status column');

    // Add constraint if not exists
    try {
      await client.query(`
        ALTER TABLE orders
        ADD CONSTRAINT check_picker_status
        CHECK (picker_status IN ('ACTIVE', 'IDLE'))
      `);
      console.log('✓ Added check constraint');
    } catch (err) {
      if (err.code === '42P10') {
        console.log('⊘ Constraint already exists (ignoring)');
      } else {
        throw err;
      }
    }

    // Update existing records
    await client.query(`
      UPDATE orders
      SET picker_status = 'IDLE'
      WHERE picker_status IS NULL
    `);
    console.log('✓ Updated existing records');

    console.log('\n✓ Migration completed successfully!');
  } catch (err) {
    console.error('\n✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();