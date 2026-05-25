// src/services/inventarioAlertaService.js
// Detects low-stock products and sends an admin alert email.
const productoModel = require('../models/productoModel');
const { sendAlertaStockBajo } = require('../config/mail');

/**
 * Returns all active products whose stock_unidades <= stock_minimo (and stock_minimo > 0).
 */
async function getProductosConStockBajo() {
  return productoModel.getProductosConStockBajo();
}

/**
 * Checks for low-stock products and sends a single alert email if any are found.
 * Safe to call fire-and-forget: errors are only logged, never thrown.
 */
async function enviarAlertaStockBajo() {
  try {
    const productos = await getProductosConStockBajo();
    if (productos.length === 0) return;
    await sendAlertaStockBajo(productos);
    console.log(`[inventarioAlerta] Alerta enviada para ${productos.length} producto(s) con stock bajo.`);
  } catch (err) {
    console.error('[inventarioAlerta] Error al enviar alerta de stock bajo:', err.message);
  }
}

module.exports = { getProductosConStockBajo, enviarAlertaStockBajo };
