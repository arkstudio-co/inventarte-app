-- Create sequence for remision numbers
CREATE SEQUENCE IF NOT EXISTS remision_number_seq START 1;

-- Create remisiones table
CREATE TABLE IF NOT EXISTS remisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remision_number TEXT NOT NULL UNIQUE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE RESTRICT,
  person_name TEXT NOT NULL,
  person_email TEXT,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('paid', 'pending')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create remision_items table
CREATE TABLE IF NOT EXISTS remision_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remision_id UUID NOT NULL REFERENCES remisiones(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_remisiones_seller_id ON remisiones(seller_id);
CREATE INDEX IF NOT EXISTS idx_remisiones_created_at ON remisiones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remision_items_remision_id ON remision_items(remision_id);

-- Function to generate remision number
CREATE OR REPLACE FUNCTION generate_remision_number()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT 'REM-' || LPAD(nextval('remision_number_seq')::TEXT, 4, '0');
$$;

-- Enable RLS
ALTER TABLE remisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE remision_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated users can do everything)
CREATE POLICY "Authenticated users can read remisiones"
  ON remisiones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert remisiones"
  ON remisiones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read remision_items"
  ON remision_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert remision_items"
  ON remision_items FOR INSERT
  TO authenticated
  WITH CHECK (true);
