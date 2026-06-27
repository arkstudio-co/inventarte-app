-- ============================================
-- Migration: Add suggested_price to products
-- ============================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS suggested_price DECIMAL(12,2);
