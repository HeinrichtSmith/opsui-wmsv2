/**
 * Migration: Fix order_items status trigger with explicit enum casting
 * Run this with: npm run migration:fix-trigger
 */

import { query } from '../db/client';

export async function up() {
  console.log('🔧 Applying order_items status trigger fix...\n');

  // Drop the old trigger and function
  await query(`DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items`);
  await query(`DROP FUNCTION IF EXISTS update_order_progress()`);

  // Recreate the function with explicit enum casting
  await query(`
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

        -- Update order progress
        UPDATE orders
        SET progress = new_progress,
            updated_at = NOW()
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

        -- Update order item status with explicit enum casting
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
  await query(`
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
}

export async function down() {
  console.log('Rolling back order_items status trigger fix...\n');
  
  await query(`DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items`);
  await query(`DROP FUNCTION IF EXISTS update_order_progress()`);
  
  console.log('✅ Rollback complete');
}

// Allow running directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('\n✨ Fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    });
}