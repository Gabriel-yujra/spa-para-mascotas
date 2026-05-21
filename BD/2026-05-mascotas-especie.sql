-- 2026-05-mascotas-especie.sql
-- Adds the especie column to mascotas.
-- The application model references this column (e.g. "perro", "gato", "otro"),
-- but it was absent from the original schema snapshot.
-- Apply once against the pet_spa database.
--
-- NOTE: Also apply 2026-05-grooming-changes.sql first if you haven't yet —
-- that file adds the `activo` column which mascotaModel also requires.

ALTER TABLE mascotas
  ADD COLUMN IF NOT EXISTS especie text;
