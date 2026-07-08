-- ============================================
-- Migration: Fix decrement_stock with validation
-- ============================================

-- Replace decrement_stock with a version that validates stock >= quantity
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_stock_before INTEGER;
  v_product_name TEXT;
  v_company_id UUID;
BEGIN
  SELECT stock, name, company_id INTO v_stock_before, v_product_name, v_company_id
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Producto no encontrado');
  END IF;

  IF v_company_id != get_user_company_id() THEN
    RETURN jsonb_build_object('error', 'No tienes acceso a este producto');
  END IF;

  IF v_stock_before < p_quantity THEN
    RETURN jsonb_build_object('error', format('Stock insuficiente: %s < %s para "%s"', v_stock_before, p_quantity, v_product_name));
  END IF;

  UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'stock_before', v_stock_before, 'stock_after', v_stock_before - p_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update increment_stock for consistency
CREATE OR REPLACE FUNCTION increment_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_stock_before INTEGER;
  v_product_name TEXT;
  v_company_id UUID;
BEGIN
  SELECT stock, name, company_id INTO v_stock_before, v_product_name, v_company_id
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Producto no encontrado');
  END IF;

  IF v_company_id != get_user_company_id() THEN
    RETURN jsonb_build_object('error', 'No tienes acceso a este producto');
  END IF;

  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'stock_before', v_stock_before, 'stock_after', v_stock_before + p_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
