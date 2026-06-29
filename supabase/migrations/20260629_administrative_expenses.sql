-- ============================================
-- Migration 20260629: Administrative Expenses
-- Monthly/recurring expenses (rent, utilities, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS administrative_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_administrative_expenses_date ON administrative_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_administrative_expenses_category ON administrative_expenses(category);

ALTER TABLE administrative_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read administrative_expenses" ON administrative_expenses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert administrative_expenses" ON administrative_expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update administrative_expenses" ON administrative_expenses
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete administrative_expenses" ON administrative_expenses
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE TRIGGER update_administrative_expenses_updated_at
  BEFORE UPDATE ON administrative_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
