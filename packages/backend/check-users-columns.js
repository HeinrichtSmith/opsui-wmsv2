const { query } = require('./dist/db/client');

query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'users\' ORDER BY ordinal_position')
  .then(r => {
    console.log('Users table columns:');
    console.log('Row count:', r.rowCount);
    console.log('Rows:', JSON.stringify(r.rows, null, 2));
    r.rows.forEach(c => {
      console.log(`${c.column_name}: ${c.data_type}`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });