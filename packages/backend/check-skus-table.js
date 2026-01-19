const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

client.connect().then(() => {
  client.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'skus\' ORDER BY ordinal_position')
    .then(result => {
      console.log('SKUS table columns:');
      result.rows.forEach(row => console.log('  - ' + row.column_name));
      client.end();
    })
    .catch(err => {
      console.error('Error:', err);
      client.end();
    });
}).catch(err => {
  console.error('Connection error:', err);
});