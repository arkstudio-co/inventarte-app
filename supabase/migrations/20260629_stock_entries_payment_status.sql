-- ============================================
-- Migration: Add payment_status to stock_entries
-- ============================================

ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending'));
