// src/services/groomingService.js
// Business logic for the grooming module.
// All database-mutating operations use transactions when touching more than one table.
const db = require('../config/db');

const trabajadorModel        = require('../models/trabajadorModel');
const citaModel              = require('../models/citaModel');
const servicioModel          = require('../models/servicioModel');
const groomingFichaModel     = require('../models/groomingFichaModel');
const groomingChecklistModel = require('../models/groomingChecklistModel');
const groomingInsumosModel   = require('../models/groomingInsumosModel');
const mascotaModel           = require('../models/mascotaModel');
const userModel              = require('../models/userModel');
const { ESTADOS, canTransition }       = require('../utils/citaEstados');
const { sendListoParaRecoger }         = require('../config/mail');
const { enviarAlertaStockBajo }        = require('./inventarioAlertaService');
const { calcularPrecioAjustado }       = require('./agendaService');

// Order of tamano values — used to prevent downgrading
const TAMANO_ORDEN = { pequeno: 1, mediano: 2, grande: 3, gigante: 4 };

// Max units allowed per individual product (not a global sum), by size
const MAX_UNIDADES_POR_PRODUCTO_FALLBACK = { pequeno: 1.0, mediano: 1.0, grande: 1.5, gigante: 2.0 };
// Default max distinct product types; override via _max_tipos key in unidades_base_por_tamano JSONB
const MAX_PRODUCTOS_DISTINTOS_DEFAULT = 5;

function getMaxUnidadesPorProducto(servicio, tamano) {
  const tabla = servicio?.unidades_base_por_tamano;
  if (tabla && typeof tabla === 'object' && tamano) {
    const k = String(tamano).toLowerCase();
    if (typeof tabla[k] === 'number' && tabla[k] > 0) return tabla[k];
  }
  return MAX_UNIDADES_POR_PRODUCTO_FALLBACK[tamano] ?? 1.0;
}

function getMaxProductosDistintos(servicio) {
  const tabla = servicio?.unidades_base_por_tamano;
  if (tabla && typeof tabla === 'object') {
    const v = tabla['_max_tipos'];
    if (typeof v === 'number' && v > 0) return v;
  }
  return MAX_PRODUCTOS_DISTINTOS_DEFAULT;
}

class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function resolverTrabajador(idUsuario) {
  const trabajador = await trabajadorModel.findTrabajadorByUsuario(idUsuario);
  if (!trabajador) {
    throw new ServiceError(404, 'No se encontró un perfil de trabajador activo para este usuario');
  }
  return trabajador;
}

async function assertCitaDelGroomer(idCita, idTrabajador) {
  const { rows } = await db.query(
    `SELECT ct.id_cita_trabajador
       FROM cita_trabajadores ct
       JOIN citas c ON c.id_cita = ct.id_cita
      WHERE ct.id_cita = $1
        AND ct.id_trabajador = $2
      LIMIT 1`,
    [idCita, idTrabajador]
  );
  if (rows.length === 0) {
    const { rows: exists } = await db.query(
      `SELECT id_cita FROM citas WHERE id_cita = $1 LIMIT 1`,
      [idCita]
    );
    if (exists.length === 0) throw new ServiceError(404, 'Cita no encontrada');
    throw new ServiceError(403, 'Esta cita no está asignada a tu usuario');
  }
}

function mergeChecklist(allItems, savedRows) {
  return allItems.map((item) => {
    const saved = savedRows.find((r) => r.id_item === item.id_item);
    return {
      id_item:     item.id_item,
      nombre:      item.nombre,
      realizado:   saved?.realizado  ?? false,
      observacion: saved?.observacion ?? null,
    };
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

async function getAgendaDelGroomer(idUsuario, { fecha, limit = 10, offset = 0 } = {}) {
  const trabajador = await resolverTrabajador(idUsuario);

  const citas = await citaModel.listCitasByTrabajador(
    trabajador.id_trabajador,
    { fecha, limit, offset }
  );

  const agenda = await Promise.all(
    citas.map(async (cita) => {
      const ficha = await groomingFichaModel.getFichaByCitaId(cita.id_cita);
      return {
        id_cita:               cita.id_cita,
        fecha_cita:            cita.fecha_cita,
        hora_inicio:           cita.fecha_inicio,
        mascota_nombre:        cita.mascota_nombre,
        mascota_tamano:        cita.mascota_tamano,
        mascota_alergias:      cita.mascota_alergias,
        mascota_restricciones: cita.mascota_restricciones,
        mascota_temperamento:  cita.mascota_temperamento,
        mascota_notas:         cita.mascota_notas,
        cliente_nombre:        cita.cliente_nombre,
        servicio_nombre:       cita.servicio_nombre,
        duracion_estimada_min: cita.duracion_estimada_min,
        estado_global:         cita.estado_global,
        tiene_ficha:           ficha !== null,
      };
    })
  );

  return agenda;
}

async function getOrCreateFichaForCita(idUsuario, idCita) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  const [cita, existing] = await Promise.all([
    citaModel.findCitaById(idCita),
    groomingFichaModel.getFichaByCitaId(idCita),
  ]);

  const mascota = cita?.id_mascota
    ? await mascotaModel.findMascotaById(cita.id_mascota)
    : null;

  // Pre-fill tamano from mascota when creating the ficha for the first time
  const fichaInitData = existing ? {} : {
    tamano_mascota:          mascota?.tamano || null,
    tamano_original_mascota: mascota?.tamano || null,
  };
  const ficha = existing || await groomingFichaModel.createFichaForCita(idCita, fichaInitData);

  const [savedChecklist, allItems, fotos, insumos, servicio] = await Promise.all([
    groomingChecklistModel.getChecklistByFichaId(ficha.id_ficha),
    groomingChecklistModel.getAllItems(),
    groomingFichaModel.getFotosByFichaId(ficha.id_ficha),
    groomingInsumosModel.findInsumosByFicha(ficha.id_ficha),
    cita?.id_servicio ? servicioModel.findServicioParaAgenda(cita.id_servicio) : Promise.resolve(null),
  ]);

  const tamanoFicha = ficha.tamano_mascota || mascota?.tamano || null;

  return {
    ficha,
    mascota,
    checklist: mergeChecklist(allItems, savedChecklist),
    fotos,
    insumos,
    estandar_unidades_producto: getMaxUnidadesPorProducto(servicio, tamanoFicha),
    max_tipos:                  getMaxProductosDistintos(servicio),
    cita: cita ? {
      id_cita:         cita.id_cita,
      estado_global:   cita.estado_global,
      fecha_cita:      cita.fecha_cita,
      servicio_nombre: cita.servicio_nombre,
      precio_final:    cita.precio_calculado != null ? Number(cita.precio_calculado) : (cita.precio != null ? Number(cita.precio) : null),
      precio_ajustado: cita.precio_calculado != null,
    } : null,
  };
}

async function updateFichaFromGroomer(idUsuario, idCita, data) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  const {
    nuevo_estado_global,
    checklist,
    estado_ingreso,
    observaciones,
    recomendaciones,
    tamano_mascota,
    temperatura,
    notas_internas,
    fecha_cierre,
    consumido_inventario,
  } = data || {};

  // ── Tamano validation + price recalculation ───────────────────────────────
  let nuevoPrecioCalculado;

  if (tamano_mascota !== undefined && tamano_mascota) {
    const fichaActual = await groomingFichaModel.getFichaByCitaId(idCita);
    const tamanoOriginal = fichaActual?.tamano_original_mascota || null;

    if (tamanoOriginal) {
      const ordenActual   = TAMANO_ORDEN[tamano_mascota]  || 0;
      const ordenOriginal = TAMANO_ORDEN[tamanoOriginal]  || 0;
      if (ordenActual < ordenOriginal) {
        throw new ServiceError(
          422,
          `No se puede reducir el tamaño a '${tamano_mascota}'. El tamaño original registrado es '${tamanoOriginal}'. Solo se permite confirmar un tamaño igual o mayor.`
        );
      }
    }

    // If tamano changed (or original not set), recalculate price
    if (!tamanoOriginal || tamano_mascota !== fichaActual?.tamano_mascota) {
      const citaParaPrecio = await citaModel.findCitaById(idCita);
      if (citaParaPrecio?.id_servicio) {
        const servicio = await servicioModel.findServicioParaAgenda(citaParaPrecio.id_servicio);
        if (servicio) {
          nuevoPrecioCalculado = calcularPrecioAjustado(servicio, tamano_mascota);
        }
      }
    }
  }

  const fichaFields = {
    ...(estado_ingreso       !== undefined && { estado_ingreso }),
    ...(observaciones        !== undefined && { observaciones }),
    ...(recomendaciones      !== undefined && { recomendaciones }),
    ...(tamano_mascota       !== undefined && { tamano_mascota }),
    ...(temperatura          !== undefined && { temperatura }),
    ...(notas_internas       !== undefined && { notas_internas }),
    ...(fecha_cierre         !== undefined && { fecha_cierre }),
    ...(consumido_inventario !== undefined && { consumido_inventario }),
  };

  const needsStateTransition = nuevo_estado_global !== undefined;
  const hasChecklist = Array.isArray(checklist) && checklist.length > 0;

  if (!needsStateTransition) {
    let ficha = await groomingFichaModel.getFichaByCitaId(idCita);
    if (!ficha) {
      ficha = await groomingFichaModel.createFichaForCita(idCita, fichaFields);
    } else if (Object.keys(fichaFields).length > 0) {
      ficha = await groomingFichaModel.updateFicha(ficha.id_ficha, fichaFields);
    }
    if (hasChecklist && ficha) {
      await groomingChecklistModel.upsertChecklistItems(ficha.id_ficha, checklist);
    }
    let citaActualizada = null;
    if (nuevoPrecioCalculado !== undefined) {
      citaActualizada = await citaModel.updateCitaCampos(idCita, { precio_calculado: nuevoPrecioCalculado });
    }
    return { ficha, ...(citaActualizada && { precio_calculado: nuevoPrecioCalculado }) };
  }

  // State change requested → validate, then run in a transaction
  const cita = await citaModel.findCitaById(idCita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (!canTransition(cita.estado_global, nuevo_estado_global)) {
    throw new ServiceError(
      409,
      `No se puede pasar de '${cita.estado_global}' a '${nuevo_estado_global}'`
    );
  }

  if (nuevo_estado_global === ESTADOS.COMPLETADA) {
    let realizados = 0;
    if (hasChecklist) {
      realizados = checklist.filter((i) => i.realizado === true).length;
    } else {
      const existingFicha = await groomingFichaModel.getFichaByCitaId(idCita);
      if (existingFicha) {
        const savedItems = await groomingChecklistModel.getChecklistByFichaId(existingFicha.id_ficha);
        realizados = savedItems.filter((i) => i.realizado === true).length;
      }
    }
    if (realizados < 1) {
      throw new ServiceError(
        422,
        'No puedes cerrar la ficha sin marcar al menos 1 ítem del checklist'
      );
    }
  }

  if (nuevo_estado_global === ESTADOS.COMPLETADA && !fichaFields.fecha_cierre) {
    fichaFields.fecha_cierre = new Date().toISOString();
  }

  const client = await db.getClient();
  let insumosDescontados = false;

  try {
    await client.query('BEGIN');

    const camposCita = {
      estado_global: nuevo_estado_global,
      terminado_por_empleado: trabajador.id_usuario,
      ...(nuevoPrecioCalculado !== undefined && { precio_calculado: nuevoPrecioCalculado }),
    };
    const citaActualizada = await citaModel.updateCitaCampos(idCita, camposCita, client);

    let ficha = await groomingFichaModel.getFichaByCitaId(idCita);
    const yaConsumo = ficha?.consumido_inventario === true;

    // Mark inventario as consumed when closing (idempotent)
    if (nuevo_estado_global === ESTADOS.COMPLETADA && !yaConsumo) {
      fichaFields.consumido_inventario = true;
    }

    if (!ficha) {
      ficha = await groomingFichaModel.createFichaForCita(idCita, fichaFields, client);
    } else if (Object.keys(fichaFields).length > 0) {
      ficha = await groomingFichaModel.updateFicha(ficha.id_ficha, fichaFields, client);
    }

    if (hasChecklist && ficha) {
      await groomingChecklistModel.upsertChecklistItems(ficha.id_ficha, checklist, client);
    }

    // Deduct stock from inventory when closing, only if not already done
    if (nuevo_estado_global === ESTADOS.COMPLETADA && !yaConsumo && ficha) {
      const insumos = await groomingInsumosModel.findInsumosByFicha(ficha.id_ficha);
      if (insumos.length > 0) {
        for (const insumo of insumos) {
          await client.query(
            `UPDATE productos
               SET stock_unidades = GREATEST(stock_unidades - $2, 0)
             WHERE id_producto = $1`,
            [insumo.id_producto, insumo.unidades_usadas]
          );
        }
        insumosDescontados = true;
      }
    }

    await client.query('COMMIT');

    // Fire-and-forget: stock alert if inventory was affected
    if (insumosDescontados) {
      (async () => {
        try { await enviarAlertaStockBajo(); }
        catch (e) { console.error('[groomingService] Error al enviar alerta stock:', e.message); }
      })();
    }

    // Fire-and-forget: email notification to client
    if (nuevo_estado_global === ESTADOS.COMPLETADA) {
      (async () => {
        try {
          const usuario = await userModel.findUserById(cita.id_usuario_cliente);
          if (usuario?.email) {
            await sendListoParaRecoger({
              clienteEmail:    usuario.email,
              clienteNombre:   usuario.nombre,
              mascotaNombre:   cita.mascota_nombre  || 'Tu mascota',
              servicioNombre:  cita.servicio_nombre || 'el servicio',
              observaciones:   fichaFields.observaciones  ?? ficha?.observaciones,
              recomendaciones: fichaFields.recomendaciones ?? ficha?.recomendaciones,
            });
          }
        } catch (mailErr) {
          console.error('[groomingService] Error enviando correo listo-para-recoger:', mailErr.message);
        }
      })();
    }

    return { ficha, cita: citaActualizada };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Insumos management ────────────────────────────────────────────────────────

async function getInsumosForCita(idUsuario, idCita) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  const ficha = await groomingFichaModel.getFichaByCitaId(idCita);
  if (!ficha) return { insumos: [], ficha_id: null };

  const insumos = await groomingInsumosModel.findInsumosByFicha(ficha.id_ficha);
  return { insumos, ficha_id: ficha.id_ficha };
}

async function saveInsumosForCita(idUsuario, idCita, items, motivo_consumo_elevado) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  let ficha = await groomingFichaModel.getFichaByCitaId(idCita);
  if (!ficha) {
    ficha = await groomingFichaModel.createFichaForCita(idCita, {});
  }

  if (ficha.consumido_inventario === true) {
    throw new ServiceError(409, 'No se pueden modificar insumos: el inventario ya fue descontado al cerrar la ficha');
  }

  await groomingInsumosModel.replaceInsumosForFicha(ficha.id_ficha, items);
  // Fetch with JOIN to productos so producto_nombre is available for checks and response
  const insumos = await groomingInsumosModel.findInsumosByFicha(ficha.id_ficha);

  // ── Per-product consumption check ────────────────────────────────────────
  const cita   = await citaModel.findCitaById(idCita);
  const tamano = ficha.tamano_mascota || null;

  let servicio = null;
  if (cita?.id_servicio) {
    servicio = await servicioModel.findServicioParaAgenda(cita.id_servicio);
  }
  const maxUnidades = getMaxUnidadesPorProducto(servicio, tamano);
  const maxTipos    = getMaxProductosDistintos(servicio);

  // Aggregate units per product (handles multiple rows with same id_producto)
  const consumoPorProducto = {};
  for (const ins of insumos) {
    const id = String(ins.id_producto);
    consumoPorProducto[id] = (consumoPorProducto[id] || 0) + parseFloat(ins.unidades_usadas || 0);
  }

  const cantTipos      = Object.keys(consumoPorProducto).length;
  const tiposExcedidos = cantTipos > maxTipos;

  const productosExcedidos = [];
  for (const [id_producto, usadas] of Object.entries(consumoPorProducto)) {
    if (usadas > maxUnidades) {
      const info = insumos.find((i) => String(i.id_producto) === id_producto);
      productosExcedidos.push({
        id_producto,
        nombre: info?.producto_nombre || `Producto #${id_producto}`,
        usadas: parseFloat(usadas.toFixed(1)),
        maximo: maxUnidades,
      });
    }
  }

  const consumoElevado = productosExcedidos.length > 0 || tiposExcedidos;

  if (consumoElevado) {
    const motivoTrimmed = motivo_consumo_elevado ? String(motivo_consumo_elevado).trim() : '';
    const fichaUpdate = { consumo_elevado: true };
    if (motivoTrimmed) fichaUpdate.motivo_consumo_elevado = motivoTrimmed;
    await groomingFichaModel.updateFicha(ficha.id_ficha, fichaUpdate);
    return {
      insumos,
      consumo_elevado:           true,
      necesita_motivo:           !motivoTrimmed,
      productos_excedidos:       productosExcedidos,
      tipos_excedidos:           tiposExcedidos,
      tipos_usados:              cantTipos,
      max_tipos:                 maxTipos,
      max_unidades_por_producto: maxUnidades,
    };
  }

  // Normal consumption → clear any previous alert
  await groomingFichaModel.updateFicha(ficha.id_ficha, {
    consumo_elevado:        false,
    motivo_consumo_elevado: null,
  });
  return {
    insumos,
    consumo_elevado:           false,
    max_unidades_por_producto: maxUnidades,
  };
}

// ── Foto upload ───────────────────────────────────────────────────────────────

const TIPOS_FOTO_VALIDOS = new Set(['llegada', 'salida']);

async function uploadFotoForCita(idUsuario, idCita, tipo, filePath) {
  const trabajador = await resolverTrabajador(idUsuario);
  await assertCitaDelGroomer(idCita, trabajador.id_trabajador);

  if (!TIPOS_FOTO_VALIDOS.has(tipo)) {
    throw new ServiceError(400, "tipo debe ser 'llegada' o 'salida'");
  }
  if (!filePath) {
    throw new ServiceError(400, 'No se recibió ningún archivo');
  }

  let ficha = await groomingFichaModel.getFichaByCitaId(idCita);
  if (!ficha) {
    ficha = await groomingFichaModel.createFichaForCita(idCita, {});
  }

  const url_foto = `/uploads/grooming/${require('path').basename(filePath)}`;
  const foto = await groomingFichaModel.createFoto(ficha.id_ficha, tipo, url_foto);
  return { foto };
}

// ── Read-only views ───────────────────────────────────────────────────────────

async function getFichaForAdmin(idCita) {
  const cita = await citaModel.findCitaById(idCita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  const mascota = cita.id_mascota
    ? await mascotaModel.findMascotaById(cita.id_mascota)
    : null;

  const ficha = await groomingFichaModel.getFichaByCitaId(idCita);

  if (!ficha) {
    return {
      ficha: null,
      mascota,
      checklist: [],
      fotos: [],
      insumos: [],
      cita: {
        id_cita:         cita.id_cita,
        estado_global:   cita.estado_global,
        fecha_cita:      cita.fecha_cita,
        servicio_nombre: cita.servicio_nombre,
      },
    };
  }

  const [savedChecklist, allItems, fotos, insumos] = await Promise.all([
    groomingChecklistModel.getChecklistByFichaId(ficha.id_ficha),
    groomingChecklistModel.getAllItems(),
    groomingFichaModel.getFotosByFichaId(ficha.id_ficha),
    groomingInsumosModel.findInsumosByFicha(ficha.id_ficha),
  ]);

  return {
    ficha,
    mascota,
    checklist: mergeChecklist(allItems, savedChecklist),
    fotos,
    insumos,
    cita: {
      id_cita:         cita.id_cita,
      estado_global:   cita.estado_global,
      fecha_cita:      cita.fecha_cita,
      servicio_nombre: cita.servicio_nombre,
    },
  };
}

async function getFichaForCliente(idUsuario, idCita) {
  const cita = await citaModel.findCitaById(idCita);
  if (!cita) throw new ServiceError(404, 'Cita no encontrada');

  if (cita.id_usuario_cliente !== idUsuario) {
    throw new ServiceError(403, 'Esta cita no pertenece a tu cuenta');
  }

  if (cita.estado_global !== ESTADOS.COMPLETADA) {
    throw new ServiceError(403, 'La ficha solo está disponible una vez completada la cita');
  }

  const mascota = cita.id_mascota
    ? await mascotaModel.findMascotaById(cita.id_mascota)
    : null;

  const ficha = await groomingFichaModel.getFichaByCitaId(idCita);

  if (!ficha) {
    return {
      mascota,
      servicio_nombre: cita.servicio_nombre,
      fecha_cita:      cita.fecha_cita,
      resumen:         null,
      checklist:       [],
      fotos:           [],
    };
  }

  const [savedChecklist, allItems, fotos] = await Promise.all([
    groomingChecklistModel.getChecklistByFichaId(ficha.id_ficha),
    groomingChecklistModel.getAllItems(),
    groomingFichaModel.getFotosByFichaId(ficha.id_ficha),
  ]);

  return {
    mascota,
    servicio_nombre: cita.servicio_nombre,
    fecha_cita:      cita.fecha_cita,
    resumen: {
      recomendaciones: ficha.recomendaciones,
      fecha_cierre:    ficha.fecha_cierre,
    },
    checklist: mergeChecklist(allItems, savedChecklist),
    fotos,
  };
}

module.exports = {
  getAgendaDelGroomer,
  getOrCreateFichaForCita,
  updateFichaFromGroomer,
  getInsumosForCita,
  saveInsumosForCita,
  uploadFotoForCita,
  getFichaForAdmin,
  getFichaForCliente,
};
