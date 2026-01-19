const { execSync } = require('child_process');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'password',
});

const sql = `
  -- Fix progress calculation to count only fully completed items
  DROP FUNCTION IF EXISTS public.update_order_progress();
  
  CREATE OR REPLACE FUNCTION public.update_order_progress() 
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    new_progress INTEGER;
  BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      -- Calculate progress based on fully completed items only
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE picked_quantity >= quantity) AS completed
      INTO total_items, completed_items
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
      
      -- Calculate progress percentage
      new_progress := CASE
        WHEN total_items > 0 THEN ROUND(completed_items::FLOAT / total_items * 100)
        ELSE 0
      END;
      
      -- Update order progress
      UPDATE orders
      SET progress = new_progress,
          updated_at = NOW()
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
      
      RETURN COALESCE(NEW, OLD);
    END IF;
  END;
  $$;

  -- Recreate trigger
  DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items;
  CREATE TRIGGER trigger_update_order_progress
    AFTER INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_progress();
`;

async function main() {
  const client = await pool.connect();
  try {
    console.log('Applying progress fix...');
    await client.query(sql);
    console.log('Progress fix applied successfully!');
  } catch (error) {
    console.error('Error applying fix:', error);
  } finally {
    await client.end();
  }
}

main();