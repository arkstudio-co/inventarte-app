-- ============================================
-- Migration 20260627: Wallet / Accounts Payable
-- ============================================

-- 1. Accounts Payable (money the company owes)
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  due_date TIMESTAMPTZ,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_supplier ON accounts_payable(supplier_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_is_paid ON accounts_payable(is_paid);

-- 2. Enable RLS
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read accounts payable" ON accounts_payable
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert accounts payable" ON accounts_payable
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update accounts payable" ON accounts_payable
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete accounts payable" ON accounts_payable
  FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Trigger for updated_at
CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON accounts_payable
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
