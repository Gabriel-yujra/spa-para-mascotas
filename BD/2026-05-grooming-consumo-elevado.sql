-- Migration: grooming elevated consumption tracking
-- Run once in pgAdmin before restarting the backend.

-- fichas_grooming: per-ficha elevated consumption flag and groomer justification
ALTER TABLE fichas_grooming
  ADD COLUMN IF NOT EXISTS consumo_elevado        BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS motivo_consumo_elevado TEXT,
  ADD COLUMN IF NOT EXISTS tamano_original_mascota TEXT;

-- servicios: optional per-product unit limits by pet size (JSONB)
-- Keys: 'pequeno', 'mediano', 'grande', 'gigante' (numeric max units per individual product)
-- Special key '_max_tipos' (integer): max distinct product types allowed (optional)
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS unidades_base_por_tamano JSONB;
