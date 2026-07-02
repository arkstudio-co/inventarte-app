-- ============================================
-- Migration 20260702: Other Income
-- Non-sales income (donations, sponsorships, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS other_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_income_date ON other_income(income_date DESC);
CREATE INDEX IF NOT EXISTS idx_other_income_category ON other_income(category);

ALTER TABLE other_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read other_income" ON other_income
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert other_income" ON other_income
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete other_income" ON other_income
  FOR DELETE USING (auth.role() = 'authenticated');
