-- ============================================
-- Migration: Add payment_method, bank_account, card_last_four to payments
-- ============================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_last_four TEXT;
