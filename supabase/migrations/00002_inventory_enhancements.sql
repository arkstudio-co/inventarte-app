-- ============================================
-- Migration 00002: Inventory Enhancements
-- Adds gramaje field, stock_entries table
-- ============================================

-- 1. Add gramaje column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS gramaje DECIMAL(10,2);

-- 2. Stock Entries (inbound)
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  observations TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_entries_product ON stock_entries(product_id);

-- 3. Increment stock function (for stock entries)
CREATE OR REPLACE FUNCTION increment_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable RLS on stock_entries
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock entries" ON stock_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert stock entries" ON stock_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
