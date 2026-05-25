-- 2026-05-pago-cita.sql
-- Agrega la columna pagado a citas para rastrear si el cliente ya pagó.
-- Ejecutar manualmente en psql o pgAdmin antes de arrancar el backend.

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS pagado BOOLEAN NOT NULL DEFAULT FALSE;

-- El campo id_referencia en transacciones ya existe (TEXT) y se usará
-- para almacenar el UUID de la cita correspondiente al pago.
