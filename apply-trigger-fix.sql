-- Drop old trigger and function
DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items;
DROP FUNCTION IF EXISTS update_order_progress();

-- Create new function with improved progress calculation
CREATE OR REPLACE FUNCTION update_order_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_items INTEGER;
  total_picked_ratio FLOAT;
  new_progress INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Calculate progress as average of item completion ratios
    SELECT 
      ROUND(AVG(picked_quantity::FLOAT / quantity * 100))
    INTO new_progress
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

    -- Update order progress only (no order_items update to prevent recursion)
    UPDATE orders
    SET progress = new_progress,
        updated_at = NOW()
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_order_progress
  AFTER INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_progress();

SELECT 'Trigger updated successfully' as result;