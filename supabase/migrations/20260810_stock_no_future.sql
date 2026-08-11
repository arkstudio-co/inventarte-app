-- Bloquear entradas de stock con fecha futura
CREATE OR REPLACE FUNCTION prevent_future_stock_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at > now() THEN
    RAISE EXCEPTION 'La fecha de entrada no puede ser futura';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_future_stock_entry_trigger ON stock_entries;
CREATE TRIGGER prevent_future_stock_entry_trigger
  BEFORE INSERT ON stock_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_future_stock_entry();

-- Quitar el efecto de las entradas aun futuras sobre el stock actual
UPDATE products p
SET stock = GREATEST(0, p.stock - COALESCE(
  (SELECT SUM(e.quantity)
   FROM stock_entries e
   WHERE e.product_id = p.id AND e.created_at > now()),
  0
));

-- Eliminar las entradas futuras ya registradas
DELETE FROM stock_entries WHERE created_at > now();