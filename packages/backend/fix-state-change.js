const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password',
});

client
  .connect()
  .then(async () => {
    const sql = `CREATE OR REPLACE FUNCTION public.generate_state_change_id()
RETURNS character varying
LANGUAGE sql
AS $function$
  SELECT 'OSC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT, 11, '0');
$function$`;

    await client.query(sql);
    console.log('Fixed generate_state_change_id to use milliseconds');
    client.end();
  })
  .catch(err => {
    console.error('Error:', err);
    client.end();
  });
