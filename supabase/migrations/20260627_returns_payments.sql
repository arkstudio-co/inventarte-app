-- ============================================
-- Migration: Returns, Payments, seller_id FK
-- ============================================

-- 1. Returns
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_seller ON returns(seller_id);
CREATE INDEX IF NOT EXISTS idx_returns_product ON returns(product_id);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read returns" ON returns
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert returns" ON returns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update returns" ON returns
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete returns" ON returns
  FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_seller ON payments(seller_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete payments" ON payments
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Add seller_id to stock_withdrawals
ALTER TABLE stock_withdrawals ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_withdrawals_seller ON stock_withdrawals(seller_id);
