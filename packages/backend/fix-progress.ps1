$sql = @'
DROP TRIGGER IF EXISTS trigger_update_order_progress ON order_items;

CREATE OR REPLACE FUNCTION public.update_order_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
  new_progress INTEGER;
BEGIN
  IF TG_OP = '"'"'"'INSERT' OR TG_OP = '"'"'"'UPDATE' THEN
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE picked_quantity >= quantity) AS completed
    INTO total_items, completed_items
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

    new_progress := CASE
      WHEN total_items > 0 THEN ROUND(completed_items::FLOAT / total_items * 100)
      ELSE 0
    END;

    UPDATE orders
    SET progress = new_progress,
        updated_at = NOW()
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  END IF;
END;
$$;

CREATE TRIGGER trigger_update_order_progress
  AFTER INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_progress();
'@

docker exec -i wms-postgres psql -U wms_user -d wms_db -c $sql