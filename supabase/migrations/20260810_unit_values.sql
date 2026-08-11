-- ============================================
-- Migration: Per-movement unit values
-- Cost is captured at each entry/withdrawal movement,
-- not read from the product at report time.
-- ============================================

ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE stock_withdrawals ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill reference value from the product's current cost
UPDATE stock_entries se
SET unit_cost = COALESCE((SELECT p.cost FROM products p WHERE p.id = se.product_id), 0)
WHERE se.unit_cost = 0;

UPDATE stock_withdrawals sw
SET unit_cost = COALESCE((SELECT p.cost FROM products p WHERE p.id = sw.product_id), 0)
WHERE sw.unit_cost = 0;