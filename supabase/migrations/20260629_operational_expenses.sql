-- ============================================
-- Migration 20260629: Operational Expenses
-- Monthly/recurring expenses (rent, utilities, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS operational_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operational_expenses_date ON operational_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_category ON operational_expenses(category);

ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read operational_expenses" ON operational_expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert operational_expenses" ON operational_expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update operational_expenses" ON operational_expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete operational_expenses" ON operational_expenses
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE TRIGGER update_operational_expenses_updated_at
  BEFORE UPDATE ON operational_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
