-- ============================================
-- Migration: unit_cost in remision_items
-- Cost is captured when the sale/return is created,
-- not read from the product at report time.
-- ============================================

ALTER TABLE remision_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2);

-- Backfill existing rows with the product's current cost
-- (best available approximation; there is no cost history stored).
UPDATE remision_items ri
SET unit_cost = COALESCE((SELECT p.cost FROM products p WHERE p.id = ri.product_id), 0)
WHERE ri.unit_cost IS NULL;