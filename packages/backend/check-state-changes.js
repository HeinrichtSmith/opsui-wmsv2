const { Client } = require('pg');

async function checkStateChanges() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if table exists
    const tableResult = await client.query(
      "SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'order_state_changes')"
    );
    console.log('Table exists:', tableResult.rows[0].exists);

    // Get columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_state_changes'
      ORDER BY ordinal_position
    `);

    console.log('\norder_state_changes columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Get sample data
    const dataResult = await client.query('SELECT * FROM order_state_changes LIMIT 5');
    console.log('\nSample data:');
    console.log(JSON.stringify(dataResult.rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStateChanges();
