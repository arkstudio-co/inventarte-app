-- ============================================
-- Fix admin profile for joansr91@gmail.com
-- Run this in Supabase SQL Editor
-- ============================================

INSERT INTO public.profiles (id, full_name, email, role)
SELECT id, 'Joan Robayo', 'joansr91@gmail.com', 'admin'
FROM auth.users WHERE email = 'joansr91@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = NOW();
