const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function applyFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing trigger recursion issue...\n');
    
    // Drop old trigger and function
    await client.query(`DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items`);
    await client.query(`DROP FUNCTION IF EXISTS update_order_progress()`);

    // Recreate function WITHOUT updating order_items status (avoids recursion)
    await client.query(`
      CREATE OR REPLACE FUNCTION update_order_progress()
      RETURNS TRIGGER AS $$
      DECLARE
        total_items INTEGER;
        completed_items INTEGER;
        new_progress INTEGER;
      BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          -- Count total items and calculate completed items
          SELECT COUNT(*), SUM(CASE WHEN picked_quantity >= quantity THEN 1 ELSE 0 END)
          INTO total_items, completed_items
          FROM order_items
          WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

          -- Calculate progress percentage
          IF total_items > 0 THEN
            new_progress := ROUND((completed_items::FLOAT / total_items::FLOAT) * 100);
          ELSE
            new_progress := 0;
          END IF;

          -- Update order progress only
          UPDATE orders
          SET progress = new_progress,
              updated_at = NOW()
          WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
        END IF;

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);

    // Recreate the trigger
    await client.query(`
      CREATE TRIGGER trigger_update_order_progress
        AFTER INSERT OR UPDATE ON order_items
        FOR EACH ROW
        EXECUTE FUNCTION update_order_progress()
    `);

    console.log('✅ Fix applied successfully!\n');
    console.log('Changes made:');
    console.log('  - Removed order_items status update from trigger (prevents recursion)');
    console.log('  - Trigger now only updates order progress');
    console.log('  - Item status is now handled by application layer\n');
    console.log('The trigger will no longer cause infinite recursion.');
    console.log('\n✨ Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyFix().catch(() => process.exit(1));