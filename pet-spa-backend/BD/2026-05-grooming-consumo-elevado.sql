-- Migration: consumo elevado de insumos en fichas de grooming
-- Run this in pgAdmin BEFORE restarting the backend.

-- 1. Alertas de consumo elevado en la ficha de grooming
ALTER TABLE fichas_grooming
  ADD COLUMN IF NOT EXISTS consumo_elevado          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_consumo_elevado   TEXT;

-- 2. Estándar de unidades por tamaño, configurable por servicio
--    Si NULL, el backend usa el mapa fijo:
--    { pequeno: 0.5, mediano: 1.0, grande: 1.5, gigante: 2.0 }
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS unidades_base_por_tamano JSONB;
