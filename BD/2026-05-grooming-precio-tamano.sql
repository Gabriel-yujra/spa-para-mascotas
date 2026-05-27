-- ============================================================
-- Migración: precio ajustado por tamaño + tamaño original en ficha
-- Ejecutar en pgAdmin sobre la base de datos pet_spa
-- ============================================================

-- 1. precio_calculado en citas
--    Almacena el precio final = precio_base × factor_tamano_raza[mascota.tamano].
--    NULL para citas antiguas (se usa s.precio como fallback en el pago).
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS precio_calculado NUMERIC(10, 2);

-- 2. tamano_original_mascota en fichas_grooming
--    Se copia de mascotas.tamano al crear la ficha.
--    Sirve como referencia mínima: el groomer solo puede confirmar un tamaño igual o mayor.
ALTER TABLE fichas_grooming
  ADD COLUMN IF NOT EXISTS tamano_original_mascota VARCHAR(20);
