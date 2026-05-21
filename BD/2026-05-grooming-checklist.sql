-- 2026-05-grooming-checklist.sql
-- Extends the grooming module with:
--   1. recomendaciones column on fichas_grooming
--   2. Unique constraints needed for upsert semantics
--   3. Default checklist items (Baño, Corte, Uñas, Oídos, Glándulas, Perfume)
-- Apply once against the pet_spa database.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add recomendaciones to fichas_grooming
--    Stores the groomer's recommendations visible to the client.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE fichas_grooming
  ADD COLUMN IF NOT EXISTS recomendaciones text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Unique constraint on checklist_items.nombre
--    Prevents duplicate seeds when the migration is re-run.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE checklist_items
  ADD CONSTRAINT IF NOT EXISTS checklist_items_nombre_unique UNIQUE (nombre);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Unique constraint on ficha_grooming_checklist (id_ficha, id_item)
--    Required for ON CONFLICT DO UPDATE upsert in groomingChecklistModel.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ficha_grooming_checklist
  ADD CONSTRAINT IF NOT EXISTS fgc_ficha_item_unique UNIQUE (id_ficha, id_item);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed default checklist items
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO checklist_items (nombre, descripcion) VALUES
  ('Baño',       'Baño completo con shampoo y acondicionador'),
  ('Corte',      'Corte de pelo según raza o preferencia del dueño'),
  ('Uñas',       'Corte y limado de uñas'),
  ('Oídos',      'Limpieza de oídos'),
  ('Glándulas',  'Expresión de glándulas anales'),
  ('Perfume',    'Aplicación de perfume o colonia para mascotas')
ON CONFLICT (nombre) DO NOTHING;
