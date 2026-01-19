/**
 * Fix enum casting in trigger
 */

import { query, closePool } from './client';
import { logger } from '../config/logger';

async function fixTrigger() {
  try {
    logger.info('Fixing trigger...');

    // Drop the old trigger
    await query(`DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items;`);
    logger.info('Dropped old trigger');

    // Create the fixed function with proper enum casting
    await query(`
      CREATE OR REPLACE FUNCTION update_order_progress()
      RETURNS TRIGGER AS $$
      DECLARE
        total_items INTEGER;
        completed_items INTEGER;
        new_progress INTEGER;
        new_status order_item_status;
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

          -- Determine the new status for this item
          IF NEW.picked_quantity >= NEW.quantity THEN
            new_status := 'FULLY_PICKED'::order_item_status;
          ELSIF NEW.picked_quantity > 0 THEN
            new_status := 'PARTIAL_PICKED'::order_item_status;
          ELSE
            new_status := 'PENDING'::order_item_status;
          END IF;

          -- Only update if status is different (avoid recursion)
          IF NEW.status IS DISTINCT FROM new_status THEN
            NEW.status := new_status;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    logger.info('Created fixed trigger function');

    // Recreate the trigger
    await query(`
      CREATE TRIGGER trigger_update_order_progress
      AFTER INSERT OR UPDATE ON order_items
      FOR EACH ROW
      EXECUTE FUNCTION update_order_progress();
    `);
    logger.info('Recreated trigger');

    logger.info('Trigger fixed successfully');
  } catch (error) {
    logger.error('Failed to fix trigger', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Run the fix
fixTrigger()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    return closePool().then(() => process.exit(1));
  });
