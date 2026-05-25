-- 2026-05-metodo-pago.sql
-- Agrega la columna metodo_pago a la tabla transacciones.
-- Ejecutar manualmente en psql o pgAdmin antes de arrancar el backend.

ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT
    CHECK (metodo_pago IN ('EFECTIVO', 'QR', 'TRANSFERENCIA'));

-- La columna es nullable para no romper transacciones de EGRESO
-- (pagos de nómina, compras de insumos, etc.) donde el método no aplica.
-- Para INGRESO se recomienda siempre registrar el método.
