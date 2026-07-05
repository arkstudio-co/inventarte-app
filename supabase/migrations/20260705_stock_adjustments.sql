-- ============================================
-- Migration: Stock Adjustments + ABC Classification
-- ============================================

-- 1. Add ABC classification fields to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS abc_classification TEXT CHECK (abc_classification IN ('A', 'B', 'C'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_count_date TIMESTAMPTZ;

-- 2. Stock Adjustments table
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('positive', 'negative')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason_code TEXT NOT NULL DEFAULT 'other' CHECK (reason_code IN ('count', 'damage', 'loss', 'return', 'found', 'correction', 'other')),
  reason TEXT,
  reference TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created ON stock_adjustments(created_at DESC);

-- 3. RPC: adjust stock with audit trail
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id UUID,
  p_adjustment_type TEXT,
  p_quantity INTEGER,
  p_reason_code TEXT DEFAULT 'other',
  p_reason TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_product_name TEXT;
BEGIN
  -- Lock product row
  SELECT stock, name INTO v_stock_before, v_product_name
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Producto no encontrado');
  END IF;

  IF p_adjustment_type = 'negative' AND v_stock_before < p_quantity THEN
    RETURN jsonb_build_object('error', format('Stock insuficiente: %s < %s', v_stock_before, p_quantity));
  END IF;

  IF p_adjustment_type = 'positive' THEN
    UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;
    v_stock_after := v_stock_before + p_quantity;
  ELSE
    UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;
    v_stock_after := v_stock_before - p_quantity;
  END IF;

  INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, stock_before, stock_after, reason_code, reason, reference, created_by)
  VALUES (p_product_id, p_adjustment_type, p_quantity, v_stock_before, v_stock_after, p_reason_code, p_reason, p_reference, auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'product', v_product_name,
    'stock_before', v_stock_before,
    'stock_after', v_stock_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: calculate ABC classification for all products
CREATE OR REPLACE FUNCTION calculate_abc_classification()
RETURNS TABLE (product_id UUID, product_name TEXT, sku TEXT, stock_value DECIMAL, classification TEXT) AS $$
DECLARE
  total_value DECIMAL;
BEGIN
  -- Calculate total inventory value
  SELECT COALESCE(SUM(stock * cost), 0) INTO total_value FROM products WHERE is_active = true AND stock > 0;

  IF total_value = 0 THEN
    UPDATE products SET abc_classification = NULL WHERE abc_classification IS NOT NULL;
    RETURN;
  END IF;

  -- Create temp table with cumulative percentage
  CREATE TEMP TABLE _abc_temp ON COMMIT DROP AS
  SELECT
    id, name, sku, stock * cost AS stock_value,
    SUM(stock * cost) OVER (ORDER BY stock * cost DESC) / total_value * 100 AS cum_pct
  FROM products
  WHERE is_active = true AND stock > 0;

  -- Update classifications
  UPDATE products p
  SET abc_classification = CASE
    WHEN t.cum_pct <= 80 THEN 'A'
    WHEN t.cum_pct <= 95 THEN 'B'
    ELSE 'C'
  END
  FROM _abc_temp t
  WHERE p.id = t.id;

  -- Non-active / zero stock gets C
  UPDATE products SET abc_classification = 'C'
  WHERE is_active = false OR stock = 0;

  RETURN QUERY
  SELECT p.id, p.name, p.sku, p.stock * p.cost AS stock_value, p.abc_classification
  FROM products p
  ORDER BY p.stock * p.cost DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock adjustments" ON stock_adjustments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert stock adjustments" ON stock_adjustments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
