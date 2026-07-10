ALTER TABLE administrative_expenses
ADD COLUMN IF NOT EXISTS last_paid_date TIMESTAMPTZ;
