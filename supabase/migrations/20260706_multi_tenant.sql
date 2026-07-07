-- ============================================
-- Migration: Multi-tenant support
-- Creates companies table, adds company_id FK
-- to all operational tables, updates RLS
-- ============================================

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read companies
CREATE POLICY "Authenticated users can read companies" ON companies
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete companies
CREATE POLICY "Admins can insert companies" ON companies
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update companies" ON companies
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Insert default company
INSERT INTO companies (name, slug)
SELECT 'Dibujarte Editores', 'dibujarte-editores'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE slug = 'dibujarte-editores');

-- 3. Add company_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);

-- Assign all existing profiles to the default company
UPDATE profiles SET company_id = (SELECT id FROM companies WHERE slug = 'dibujarte-editores')
WHERE company_id IS NULL;

-- Make company_id NOT NULL for future inserts
ALTER TABLE profiles ALTER COLUMN company_id SET NOT NULL;

-- 4. Add company_id to all operational tables
-- Helper function to add company_id + FK + index
DO $$
DECLARE
  tables_to_update TEXT[] := ARRAY[
    'products', 'suppliers', 'stock_withdrawals', 'stock_entries',
    'sellers', 'returns', 'payments', 'accounts_payable',
    'administrative_expenses', 'remisiones', 'purchase_orders',
    'stock_adjustments', 'other_income', 'landing_products',
    'company_info', 'community_companies', 'contact_messages'
  ];
  t TEXT;
  default_company_id UUID;
BEGIN
  SELECT id INTO default_company_id FROM companies WHERE slug = 'dibujarte-editores';

  FOREACH t IN ARRAY tables_to_update
  LOOP
    -- Add column if not exists
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id)', t);
    -- Set default value for existing rows
    EXECUTE format('UPDATE %I SET company_id = $1 WHERE company_id IS NULL', t) USING default_company_id;
    -- Make it NOT NULL (except for contact_messages which may come from public submissions)
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
    -- Add index
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_company ON %I(company_id)', t, t);
  END LOOP;

  -- contact_messages can have NULL company_id (public submissions)
  ALTER TABLE contact_messages ALTER COLUMN company_id DROP NOT NULL;
END $$;

-- 5. Drop existing RLS policies and recreate with company_id filter
-- We'll use a helper function to get the current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- Helper: get admin status once
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 6. Recreate RLS policies for all tables

-- PROFILES: users can read their own profile within same company, admins can read all within company
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

CREATE POLICY "Users can read profiles in same company" ON profiles
  FOR SELECT USING (
    company_id = get_user_company_id()
    AND (
      id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Admins can update profiles in same company" ON profiles
  FOR UPDATE USING (
    company_id = get_user_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert profiles in same company" ON profiles
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete profiles in same company" ON profiles
  FOR DELETE USING (
    company_id = get_user_company_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PRODUCTS
DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

CREATE POLICY "Company users can read products" ON products
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert products" ON products
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update products" ON products
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete products" ON products
  FOR DELETE USING (company_id = get_user_company_id());

-- SUPPLIERS
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON suppliers;

CREATE POLICY "Company users can read suppliers" ON suppliers
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert suppliers" ON suppliers
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update suppliers" ON suppliers
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete suppliers" ON suppliers
  FOR DELETE USING (company_id = get_user_company_id());

-- STOCK WITHDRAWALS
DROP POLICY IF EXISTS "Authenticated users can read withdrawals" ON stock_withdrawals;
DROP POLICY IF EXISTS "Authenticated users can insert withdrawals" ON stock_withdrawals;

CREATE POLICY "Company users can read withdrawals" ON stock_withdrawals
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert withdrawals" ON stock_withdrawals
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update withdrawals" ON stock_withdrawals
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete withdrawals" ON stock_withdrawals
  FOR DELETE USING (company_id = get_user_company_id());

-- STOCK ENTRIES
DROP POLICY IF EXISTS "Authenticated users can read stock entries" ON stock_entries;
DROP POLICY IF EXISTS "Authenticated users can insert stock entries" ON stock_entries;

CREATE POLICY "Company users can read stock entries" ON stock_entries
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert stock entries" ON stock_entries
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update stock entries" ON stock_entries
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete stock entries" ON stock_entries
  FOR DELETE USING (company_id = get_user_company_id());

-- SELLERS
DROP POLICY IF EXISTS "Authenticated users can read sellers" ON sellers;
DROP POLICY IF EXISTS "Authenticated users can insert sellers" ON sellers;
DROP POLICY IF EXISTS "Authenticated users can update sellers" ON sellers;
DROP POLICY IF EXISTS "Authenticated users can delete sellers" ON sellers;

CREATE POLICY "Company users can read sellers" ON sellers
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert sellers" ON sellers
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update sellers" ON sellers
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete sellers" ON sellers
  FOR DELETE USING (company_id = get_user_company_id());

-- RETURNS
DROP POLICY IF EXISTS "Authenticated users can read returns" ON returns;
DROP POLICY IF EXISTS "Authenticated users can insert returns" ON returns;
DROP POLICY IF EXISTS "Authenticated users can update returns" ON returns;
DROP POLICY IF EXISTS "Authenticated users can delete returns" ON returns;

CREATE POLICY "Company users can read returns" ON returns
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert returns" ON returns
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update returns" ON returns
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete returns" ON returns
  FOR DELETE USING (company_id = get_user_company_id());

-- PAYMENTS
DROP POLICY IF EXISTS "Authenticated users can read payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;

CREATE POLICY "Company users can read payments" ON payments
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert payments" ON payments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update payments" ON payments
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete payments" ON payments
  FOR DELETE USING (company_id = get_user_company_id());

-- ACCOUNTS PAYABLE
DROP POLICY IF EXISTS "Authenticated users can read accounts payable" ON accounts_payable;
DROP POLICY IF EXISTS "Authenticated users can insert accounts payable" ON accounts_payable;
DROP POLICY IF EXISTS "Authenticated users can update accounts payable" ON accounts_payable;
DROP POLICY IF EXISTS "Authenticated users can delete accounts payable" ON accounts_payable;

CREATE POLICY "Company users can read accounts payable" ON accounts_payable
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert accounts payable" ON accounts_payable
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update accounts payable" ON accounts_payable
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete accounts payable" ON accounts_payable
  FOR DELETE USING (company_id = get_user_company_id());

-- ADMINISTRATIVE EXPENSES
DROP POLICY IF EXISTS "Authenticated users can read administrative_expenses" ON administrative_expenses;
DROP POLICY IF EXISTS "Authenticated users can insert administrative_expenses" ON administrative_expenses;
DROP POLICY IF EXISTS "Authenticated users can update administrative_expenses" ON administrative_expenses;
DROP POLICY IF EXISTS "Authenticated users can delete administrative_expenses" ON administrative_expenses;

CREATE POLICY "Company users can read administrative expenses" ON administrative_expenses
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert administrative expenses" ON administrative_expenses
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update administrative expenses" ON administrative_expenses
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete administrative expenses" ON administrative_expenses
  FOR DELETE USING (company_id = get_user_company_id());

-- REMISIONES
DROP POLICY IF EXISTS "Authenticated users can read remisiones" ON remisiones;
DROP POLICY IF EXISTS "Authenticated users can insert remisiones" ON remisiones;

CREATE POLICY "Company users can read remisiones" ON remisiones
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert remisiones" ON remisiones
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update remisiones" ON remisiones
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete remisiones" ON remisiones
  FOR DELETE USING (company_id = get_user_company_id());

-- REMISION ITEMS (inherits through remisiones, but add policy for direct access)
DROP POLICY IF EXISTS "Authenticated users can read remision_items" ON remision_items;
DROP POLICY IF EXISTS "Authenticated users can insert remision_items" ON remision_items;

CREATE POLICY "Company users can read remision items" ON remision_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM remisiones
      WHERE remisiones.id = remision_items.remision_id
      AND remisiones.company_id = get_user_company_id()
    )
  );
CREATE POLICY "Company users can insert remision items" ON remision_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM remisiones
      WHERE remisiones.id = remision_items.remision_id
      AND remisiones.company_id = get_user_company_id()
    )
  );
CREATE POLICY "Company users can update remision items" ON remision_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM remisiones
      WHERE remisiones.id = remision_items.remision_id
      AND remisiones.company_id = get_user_company_id()
    )
  );
CREATE POLICY "Company users can delete remision items" ON remision_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM remisiones
      WHERE remisiones.id = remision_items.remision_id
      AND remisiones.company_id = get_user_company_id()
    )
  );

-- PURCHASE ORDERS
DROP POLICY IF EXISTS "Authenticated users can read purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can insert purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can update purchase orders" ON purchase_orders;

CREATE POLICY "Company users can read purchase orders" ON purchase_orders
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert purchase orders" ON purchase_orders
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update purchase orders" ON purchase_orders
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete purchase orders" ON purchase_orders
  FOR DELETE USING (company_id = get_user_company_id());

-- PURCHASE ORDER ITEMS
DROP POLICY IF EXISTS "Authenticated users can read purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Authenticated users can insert purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Authenticated users can update purchase order items" ON purchase_order_items;
DROP POLICY IF EXISTS "Authenticated users can delete purchase order items" ON purchase_order_items;

CREATE POLICY "Company users can read purchase order items" ON purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.order_id
      AND purchase_orders.company_id = get_user_company_id()
    )
  );
CREATE POLICY "Company users can insert purchase order items" ON purchase_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.order_id
      AND purchase_orders.company_id = get_user_company_id()
    )
  );
CREATE POLICY "Company users can update purchase order items" ON purchase_order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.order_id
      AND purchase_orders.company_id = get_user_company_id()
    )
  );
CREATE POLICY "Company users can delete purchase order items" ON purchase_order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.order_id
      AND purchase_orders.company_id = get_user_company_id()
    )
  );

-- STOCK ADJUSTMENTS
DROP POLICY IF EXISTS "Authenticated users can read stock adjustments" ON stock_adjustments;
DROP POLICY IF EXISTS "Authenticated users can insert stock adjustments" ON stock_adjustments;

CREATE POLICY "Company users can read stock adjustments" ON stock_adjustments
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert stock adjustments" ON stock_adjustments
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update stock adjustments" ON stock_adjustments
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete stock adjustments" ON stock_adjustments
  FOR DELETE USING (company_id = get_user_company_id());

-- OTHER INCOME
DROP POLICY IF EXISTS "Authenticated users can read other_income" ON other_income;
DROP POLICY IF EXISTS "Authenticated users can insert other_income" ON other_income;
DROP POLICY IF EXISTS "Authenticated users can delete other_income" ON other_income;

CREATE POLICY "Company users can read other income" ON other_income
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can insert other income" ON other_income
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update other income" ON other_income
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete other income" ON other_income
  FOR DELETE USING (company_id = get_user_company_id());

-- LANDING PRODUCTS: public read, company-scoped write
DROP POLICY IF EXISTS "Public can read landing products" ON landing_products;
DROP POLICY IF EXISTS "Authenticated users can manage landing products" ON landing_products;

CREATE POLICY "Public can read landing products" ON landing_products
  FOR SELECT USING (TRUE);
CREATE POLICY "Company users can insert landing products" ON landing_products
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update landing products" ON landing_products
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete landing products" ON landing_products
  FOR DELETE USING (company_id = get_user_company_id());

-- COMPANY INFO: public read, company-scoped write
DROP POLICY IF EXISTS "Public can read company info" ON company_info;
DROP POLICY IF EXISTS "Authenticated users can update company info" ON company_info;

CREATE POLICY "Public can read company info" ON company_info
  FOR SELECT USING (TRUE);
CREATE POLICY "Company users can insert company info" ON company_info
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update company info" ON company_info
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete company info" ON company_info
  FOR DELETE USING (company_id = get_user_company_id());

-- COMMUNITY COMPANIES: public read, company-scoped write
DROP POLICY IF EXISTS "Community companies public read" ON community_companies;
DROP POLICY IF EXISTS "Community companies admin insert" ON community_companies;
DROP POLICY IF EXISTS "Community companies admin update" ON community_companies;
DROP POLICY IF EXISTS "Community companies admin delete" ON community_companies;

CREATE POLICY "Public can read community companies" ON community_companies
  FOR SELECT USING (TRUE);
CREATE POLICY "Company users can insert community companies" ON community_companies
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company users can update community companies" ON community_companies
  FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete community companies" ON community_companies
  FOR DELETE USING (company_id = get_user_company_id());

-- CONTACT MESSAGES: public insert, company-scoped read
DROP POLICY IF EXISTS "Public can insert contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Authenticated users can read contact messages" ON contact_messages;

CREATE POLICY "Public can insert contact messages" ON contact_messages
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Company users can read contact messages" ON contact_messages
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Company users can delete contact messages" ON contact_messages
  FOR DELETE USING (company_id = get_user_company_id());

-- 7. Update handle_new_user function to include company_id via invitation or default
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Try to get company_id from user metadata (set when admin creates user)
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;

  -- Fallback: assign to default company
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM companies WHERE slug = 'dibujarte-editores';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'operative'),
    v_company_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions remain system-wide (not scoped to company)

-- 8. Update RPC functions to be company-scoped where needed

-- Update adjust_stock to accept company_id check
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id UUID,
  p_adjustment_type TEXT,
  p_quantity INTEGER,
  p_reason_code TEXT DEFAULT 'other',
  p_reason TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_product_name TEXT;
  v_company_id UUID;
BEGIN
  -- Get product info and verify company access
  SELECT stock, name, company_id INTO v_stock_before, v_product_name, v_company_id
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Producto no encontrado');
  END IF;

  -- Verify company access
  IF v_company_id != get_user_company_id() THEN
    RETURN jsonb_build_object('error', 'No tienes acceso a este producto');
  END IF;

  IF p_adjustment_type = 'negative' AND v_stock_before < p_quantity THEN
    RETURN jsonb_build_object('error', format('Stock insuficiente: %s < %s', v_stock_before, p_quantity));
  END IF;

  IF p_adjustment_type = 'positive' THEN
    UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;
    v_stock_after := v_stock_before + p_quantity;
  ELSE
    UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;
    v_stock_after := v_stock_before - p_quantity;
  END IF;

  INSERT INTO stock_adjustments (product_id, company_id, adjustment_type, quantity, stock_before, stock_after, reason_code, reason, reference, created_by)
  VALUES (p_product_id, v_company_id, p_adjustment_type, p_quantity, v_stock_before, v_stock_after, p_reason_code, p_reason, p_reference, auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'product', v_product_name,
    'stock_before', v_stock_before,
    'stock_after', v_stock_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update calculate_abc_classification to be company-scoped
CREATE OR REPLACE FUNCTION calculate_abc_classification()
RETURNS TABLE (product_id UUID, product_name TEXT, sku TEXT, stock_value DECIMAL, classification TEXT) AS $$
DECLARE
  total_value DECIMAL;
  v_company_id UUID;
BEGIN
  v_company_id := get_user_company_id();

  -- Calculate total inventory value for this company
  SELECT COALESCE(SUM(stock * cost), 0) INTO total_value
  FROM products WHERE is_active = true AND stock > 0 AND company_id = v_company_id;

  IF total_value = 0 THEN
    UPDATE products SET abc_classification = NULL
    WHERE abc_classification IS NOT NULL AND company_id = v_company_id;
    RETURN;
  END IF;

  -- Create temp table with cumulative percentage
  CREATE TEMP TABLE IF NOT EXISTS _abc_temp ON COMMIT DROP AS
  SELECT
    id, name, sku, stock * cost AS stock_value,
    SUM(stock * cost) OVER (ORDER BY stock * cost DESC) / total_value * 100 AS cum_pct
  FROM products
  WHERE is_active = true AND stock > 0 AND company_id = v_company_id;

  -- Update classifications
  UPDATE products p
  SET abc_classification = CASE
    WHEN t.cum_pct <= 80 THEN 'A'
    WHEN t.cum_pct <= 95 THEN 'B'
    ELSE 'C'
  END
  FROM _abc_temp t
  WHERE p.id = t.id;

  -- Non-active / zero stock gets C
  UPDATE products SET abc_classification = 'C'
  WHERE (is_active = false OR stock = 0) AND company_id = v_company_id;

  RETURN QUERY
  SELECT p.id, p.name, p.sku, p.stock * p.cost AS stock_value, p.abc_classification
  FROM products p
  WHERE p.company_id = v_company_id
  ORDER BY p.stock * p.cost DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
