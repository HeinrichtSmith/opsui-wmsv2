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
    console.log('🔧 Applying order_items status trigger fix...\n');

    // Drop old trigger and function
    await client.query(`DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items`);
    await client.query(`DROP FUNCTION IF EXISTS update_order_progress()`);

    // Recreate the function with explicit enum casting
    await client.query(`
      CREATE OR REPLACE FUNCTION update_order_progress()
      RETURNS TRIGGER AS $$
      DECLARE
        total_items INTEGER;
        completed_items INTEGER;
        new_progress INTEGER;
      BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          SELECT COUNT(*), SUM(CASE WHEN picked_quantity >= quantity THEN 1 ELSE 0 END)
          INTO total_items, completed_items
          FROM order_items
          WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

          IF total_items > 0 THEN
            new_progress := ROUND((completed_items::FLOAT / total_items::FLOAT) * 100);
          ELSE
            new_progress := 0;
          END IF;

          UPDATE orders
          SET progress = new_progress,
              updated_at = NOW()
          WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

          IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            UPDATE order_items
            SET status = CASE
              WHEN picked_quantity >= quantity THEN 'FULLY_PICKED'::order_item_status
              WHEN picked_quantity > 0 THEN 'PARTIAL_PICKED'::order_item_status
              ELSE 'PENDING'::order_item_status
            END
            WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id);
          END IF;
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

    console.log('✅ Migration applied successfully!\n');
    console.log('Changes made:');
    console.log('  - Dropped old trigger and function');
    console.log('  - Recreated update_order_progress() function with explicit enum casting');
    console.log('  - Recreated trigger_update_order_progress trigger\n');
    console.log('The database trigger will now correctly handle order_item_status enum values.');
    console.log('\n✨ Fix completed successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyFix().catch(() => process.exit(1));
