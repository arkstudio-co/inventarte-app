-- ============================================
-- Fix: RLS recursion in profiles policies
-- get_user_company_id() and get_user_role()
-- must be SECURITY DEFINER to avoid infinite
-- recursion when called from profiles RLS.
-- ============================================

-- 1. Recreate get_user_company_id() with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER
AS $$ SELECT company_id FROM profiles WHERE id = auth.uid(); $$;

-- 2. Recreate get_user_role() with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER
AS $$ SELECT role FROM profiles WHERE id = auth.uid(); $$;

-- 3. Fix companies policies — use get_user_role() instead of subquery to profiles
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
CREATE POLICY "Admins can insert companies" ON companies
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update companies" ON companies;
CREATE POLICY "Admins can update companies" ON companies
  FOR UPDATE USING (get_user_role() = 'admin');

-- 4. Fix profiles policies — use get_user_role() instead of subquery to profiles
DROP POLICY IF EXISTS "Users can read profiles in same company" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in same company" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in same company" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in same company" ON profiles;

CREATE POLICY "Users can read profiles in same company" ON profiles
  FOR SELECT USING (
    company_id = get_user_company_id()
    AND (id = auth.uid() OR get_user_role() = 'admin')
  );

CREATE POLICY "Admins can update profiles in same company" ON profiles
  FOR UPDATE USING (company_id = get_user_company_id() AND get_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles in same company" ON profiles
  FOR INSERT WITH CHECK (company_id = get_user_company_id() AND get_user_role() = 'admin');

CREATE POLICY "Admins can delete profiles in same company" ON profiles
  FOR DELETE USING (company_id = get_user_company_id() AND get_user_role() = 'admin');
