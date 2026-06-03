-- ============================================
-- Add standalone fields to landing_products
-- ============================================

ALTER TABLE landing_products 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS precio DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Seed initial products if none exist
INSERT INTO landing_products (title, description, precio, image_url, display_order, is_active)
SELECT 'Lecto Escritura', 'Cuaderno de actividades diseñado para fortalecer las habilidades de lectura y escritura en los primeros años escolares, con ejercicios progresivos y divertidos.', 25000, '/images/1-Lecto-Escritura-Dibujarte-Productos.png', 1, true
WHERE NOT EXISTS (SELECT 1 FROM landing_products WHERE title IS NOT NULL LIMIT 1);

INSERT INTO landing_products (title, description, precio, image_url, display_order, is_active)
SELECT 'Prematemáticas', 'Material didáctico que introduce conceptos matemáticos básicos como números, formas y patrones, ideal para el desarrollo del pensamiento lógico en niños.', 25000, '/images/2-Prematematicas-Dibujarte-Productos.png', 2, true
WHERE NOT EXISTS (SELECT 1 FROM landing_products WHERE title IS NOT NULL LIMIT 1);

INSERT INTO landing_products (title, description, precio, image_url, display_order, is_active)
SELECT 'Mi Cuaderno', 'Cuaderno versátil con páginas pautadas y espacio para dibujo, perfecto para tareas escolares, apuntes y proyectos creativos del día a día.', 25000, '/images/3-MiCuaderno-Dibujarte-Productos.png', 3, true
WHERE NOT EXISTS (SELECT 1 FROM landing_products WHERE title IS NOT NULL LIMIT 1);
