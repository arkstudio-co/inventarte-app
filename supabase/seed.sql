-- ============================================
-- Seed: Datos de prueba para Dibujarte
-- ============================================
-- Ejecuta esto DESPUÉS de las migraciones
-- ============================================

-- 0. EMPRESA POR DEFECTO
INSERT INTO public.companies (name, slug)
SELECT 'Dibujarte Editores', 'dibujarte-editores'
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE slug = 'dibujarte-editores');

-- 1. USUARIO ADMINISTRADOR
-- Email: admin@dibujarte.com / Contraseña: Admin123!
DO $$
DECLARE
  user_id UUID := gen_random_uuid();
  admin_email TEXT := 'admin@dibujarte.com';
  admin_password TEXT := 'Admin123!';
  existing_id UUID;
  default_company_id UUID;
BEGIN
  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'dibujarte-editores';

  SELECT id INTO existing_id FROM auth.users WHERE email = admin_email;
  IF existing_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_id, 'authenticated', 'authenticated',
      admin_email, crypt(admin_password, gen_salt('bf')),
      NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin Dibujarte"}',
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), user_id,
      format('{"sub":"%s","email":"%s"}', user_id::text, admin_email)::jsonb,
      'email', NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (id, full_name, email, role, company_id)
    VALUES (user_id, 'Admin Dibujarte', admin_email, 'admin', default_company_id);

    RAISE NOTICE '✅ Admin creado: admin@dibujarte.com / Admin123!';
  ELSE
    RAISE NOTICE '👤 Admin ya existe';
  END IF;
END $$;

-- 2. USUARIO OPERATIVO
-- Email: operativo@dibujarte.com / Contraseña: Operativo123!
DO $$
DECLARE
  user_id UUID := gen_random_uuid();
  op_email TEXT := 'operativo@dibujarte.com';
  op_password TEXT := 'Operativo123!';
  existing_id UUID;
  default_company_id UUID;
BEGIN
  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'dibujarte-editores';

  SELECT id INTO existing_id FROM auth.users WHERE email = op_email;
  IF existing_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      user_id, 'authenticated', 'authenticated',
      op_email, crypt(op_password, gen_salt('bf')),
      NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Operativo Dibujarte"}',
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), user_id,
      format('{"sub":"%s","email":"%s"}', user_id::text, op_email)::jsonb,
      'email', NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (id, full_name, email, role, company_id)
    VALUES (user_id, 'Operativo Dibujarte', op_email, 'operative', default_company_id);

    RAISE NOTICE '✅ Operativo creado: operativo@dibujarte.com / Operativo123!';
  ELSE
    RAISE NOTICE '👤 Operativo ya existe';
  END IF;
END $$;

-- 3. PROVEEDORES
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'dibujarte-editores';

  INSERT INTO public.suppliers (name, contact, email, phone, company_id)
  SELECT * FROM (VALUES
    ('Papelera Nacional', 'Carlos López', 'carlos@papeleranacional.com', '3001234567', default_company_id),
    ('Art Supplies Colombia', 'María García', 'maria@artsupplies.co', '3107654321', default_company_id),
    ('Distribuidora de Arte', 'Pedro Martínez', 'pedro@distribuidoraarte.com', '3209876543', default_company_id),
    ('Insumos Gráficos SAS', 'Laura Fernández', 'laura@insumosgraficos.com', '3012345678', default_company_id)
  ) AS v(name, contact, email, phone, company_id)
  WHERE NOT EXISTS (SELECT 1 FROM public.suppliers);
END $$;

-- 4. PRODUCTOS DE EJEMPLO (solo si no existen)
DO $$
DECLARE
  admin_id UUID;
  s1_id UUID; s2_id UUID; s3_id UUID;
  default_company_id UUID;
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM public.products;
  IF product_count > 0 THEN
    RAISE NOTICE '📦 Productos ya existen, saltando...';
    RETURN;
  END IF;

  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'dibujarte-editores';
  SELECT id INTO admin_id FROM public.profiles WHERE email = 'admin@dibujarte.com' LIMIT 1;
  SELECT id INTO s1_id FROM public.suppliers WHERE name = 'Papelera Nacional' LIMIT 1;
  SELECT id INTO s2_id FROM public.suppliers WHERE name = 'Art Supplies Colombia' LIMIT 1;
  SELECT id INTO s3_id FROM public.suppliers WHERE name = 'Distribuidora de Arte' LIMIT 1;

  INSERT INTO public.products (sku, name, description, stock, min_stock, price, cost, supplier_id, created_by, company_id) VALUES
    ('ART-1A2-B3C', 'Block de Dibujo A3', 'Block profesional de dibujo, papel 120g/m², 50 hojas', 45, 10, 25000, 15000, s1_id, admin_id, default_company_id),
    ('LAP-4D5-E6F', 'Lápiz Grafito Profesional 2B', 'Lápiz de dibujo profesional, mina 2B, pack x12', 120, 20, 18000, 9000, s2_id, admin_id, default_company_id),
    ('ACU-7G8-H9I', 'Acuarelas 24 Colores', 'Estuche de acuarelas profesionales, 24 colores vibrantes', 30, 5, 65000, 38000, s2_id, admin_id, default_company_id),
    ('PIN-J1K-2L3', 'Pinceles Set x10', 'Set de pinceles profesionales, diferentes puntas y grosores', 25, 8, 42000, 25000, s3_id, admin_id, default_company_id),
    ('MAR-4M5-N6O', 'Marcadores Puntilla 12 colores', 'Marcadores de punta fina para lettering y detalles', 80, 15, 35000, 20000, s2_id, admin_id, default_company_id),
    ('OLE-7P8-Q9R', 'Óleo Profesional Set x12', 'Pintura al óleo profesional, colores básicos, tubos 37ml', 15, 3, 120000, 75000, s3_id, admin_id, default_company_id),
    ('CAR-S1T-2U3', 'Cartulina Opalina x10', 'Pliego de cartulina opalina, colores variados, pack x10', 200, 30, 15000, 8000, s1_id, admin_id, default_company_id),
    ('LIQ-V4W-5X6', 'Líquido Corrector 20ml', 'Corrector líquido blanco, secado rápido', 300, 50, 5000, 2500, s1_id, admin_id, default_company_id);

  RAISE NOTICE '✅ Productos de ejemplo insertados';
END $$;

-- 5. INFO DE EMPRESA (Landing Page)
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'dibujarte-editores';

  INSERT INTO public.company_info (hero_title, hero_description, email, phone, about_text, work_history, company_id)
  SELECT 'Dibujarte Editores',
    'Tu proveedor de confianza en materiales de arte y papelería. Calidad y variedad para dar vida a tus proyectos creativos.',
    'eldice16@gmail.com',
    '3001234567',
    'Somos una empresa dedicada a la distribución de materiales de arte, papelería y suministros creativos.',
    'Colegios Distritales, Universidades, Talleres de Arte, Galerías, y clientes particulares en toda Colombia.',
    default_company_id
  WHERE NOT EXISTS (SELECT 1 FROM public.company_info);
END $$;

-- 6. COMUNIDAD EDUCATIVA (Empresas)
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'dibujarte-editores';

  INSERT INTO public.community_companies (name, display_order, company_id)
  SELECT * FROM (VALUES
    ('Colegio San José', 1, default_company_id),
    ('Gimnasio Campestre', 2, default_company_id),
    ('Colegio Anglo Americano', 3, default_company_id),
    ('Instituto Técnico Central', 4, default_company_id),
    ('Liceo Cervantes', 5, default_company_id),
    ('Colegio Nueva Granada', 6, default_company_id)
  ) AS v(name, display_order, company_id)
  WHERE NOT EXISTS (SELECT 1 FROM public.community_companies);
END $$;
