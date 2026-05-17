// src/controllers/auditController.js
// NUEVO. Endpoint de consulta de audit_log para el admin/jefe.
const auditLogModel = require('../models/auditLogModel');

/**
 * GET /api/audit-log
 * Query params soportados:
 *   from        ISO date  (a.fecha >= from)
 *   to          ISO date  (a.fecha <= to)
 *   accion      string    (a.accion = accion)
 *   id_usuario  UUID
 *   page        número 1-based, default 1
 *   pageSize    default 50, max 200
 */
exports.listLogs = async (req, res) => {
  try {
    const { from, to, accion, id_usuario, page, pageSize } = req.query;
    const result = await auditLogModel.findLogs({
      from: from || null,
      to: to || null,
      accion: accion || null,
      id_usuario: id_usuario || null,
      page,
      pageSize,
    });
    return res.status(200).json({
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / result.pageSize),
      items: result.items,
    });
  } catch (err) {
    console.error('[auditController.listLogs]', err);
    return res.status(500).json({ error: 'Error al listar logs', message: err.message });
  }
};

/**
 * GET /api/audit-log/export
 * Devuelve TODOS los registros que matcheen los filtros (sin paginación), capeado a un máximo
 * para evitar dumps gigantes. El frontend se encarga de generar PDF/CSV.
 */
exports.exportLogs = async (req, res) => {
  try {
    const { from, to, accion, id_usuario } = req.query;
    // Capeamos a 5000 filas por seguridad
    const result = await auditLogModel.findLogs({
      from: from || null,
      to: to || null,
      accion: accion || null,
      id_usuario: id_usuario || null,
      page: 1,
      pageSize: 5000,
    });
    return res.status(200).json({
      generated_at: new Date().toISOString(),
      filters: { from, to, accion, id_usuario },
      count: result.items.length,
      items: result.items,
    });
  } catch (err) {
    console.error('[auditController.exportLogs]', err);
    return res.status(500).json({ error: 'Error al exportar logs', message: err.message });
  }
};
