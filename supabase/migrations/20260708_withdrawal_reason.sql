ALTER TABLE stock_withdrawals
  ADD COLUMN reason TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE stock_withdrawals
  ALTER COLUMN person_name DROP NOT NULL,
  ALTER COLUMN person_email DROP NOT NULL;
