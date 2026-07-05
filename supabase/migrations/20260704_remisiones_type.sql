-- Add type column to remisiones for unified transaction tracking
ALTER TABLE remisiones ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'sale' CHECK (type IN ('sale', 'return', 'payment'));

-- Allow remision_items to have any non-zero quantity (returns use negative qty)
ALTER TABLE remision_items DROP CONSTRAINT IF EXISTS remision_items_quantity_check;
ALTER TABLE remision_items ADD CONSTRAINT remision_items_quantity_check CHECK (quantity != 0);

-- Allow remision_items to have any subtotal (returns use negative subtotal)
ALTER TABLE remision_items DROP CONSTRAINT IF EXISTS remision_items_subtotal_check;
ALTER TABLE remision_items ADD CONSTRAINT remision_items_subtotal_check CHECK (subtotal != 0);

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_remisiones_type ON remisiones(type);
