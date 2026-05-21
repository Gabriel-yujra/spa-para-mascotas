-- 2026-05-grooming-changes.sql
-- Changes required to support the grooming module (v1 / demo).
-- Apply once against the pet_spa database.
-- All existing tables and columns are already present; this file adds constraints
-- and one missing column discovered during integration.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enforce one ficha per cita
--
-- fichas_grooming.id_cita has no UNIQUE constraint in the current schema.
-- The service uses getOrCreate semantics (LIMIT 1), but a DB-level constraint
-- prevents accidental duplicates from concurrent inserts or future code paths.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE fichas_grooming
  ADD CONSTRAINT fichas_grooming_id_cita_unique UNIQUE (id_cita);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add activo column to mascotas
--
-- mascotaModel.js uses soft-delete (activo = false) but the column is not
-- present in the current schema (tablas.txt).  Required by the mascotas module
-- implemented in the previous sprint and referenced here via JOIN.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE mascotas
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
