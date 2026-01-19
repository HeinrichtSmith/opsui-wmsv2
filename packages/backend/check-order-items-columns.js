const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password'
});

client.connect()
  .then(async () => {
    const result = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'order_items' 
       ORDER BY ordinal_position`
    );
    
    console.log('order_items columns:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });
    
    client.end();
  })
  .catch(err => {
    console.error('Error:', err);
    client.end();
  });