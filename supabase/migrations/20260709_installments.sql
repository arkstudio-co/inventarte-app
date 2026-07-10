ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS installment_number INTEGER,
  ADD COLUMN IF NOT EXISTS total_installments INTEGER,
  ADD COLUMN IF NOT EXISTS installment_group_id UUID;
