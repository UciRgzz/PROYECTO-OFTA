const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const multer = require('multer');
const xlsx = require('xlsx');
const { deprecate } = require('util');


const app = express();

// ==================== CONFIGURACIONES ====================

// Middleware
app.use(cors({
    origin: "http://localhost:3000",  // URL de tu frontend
    credentials: true                 // permitir envío de cookies de sesión
}));
app.use(bodyParser.json());




// Sesiones
app.use(session({
    secret: 'mi_secreto_super_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // false porque usas http://localhost
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hora
    }
}));

/*// PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Optavision',
    password: '12345',
    port: 5432
});*/

const pool = new Pool({
  user: 'optauser',
  host: 'localhost',
  database: 'optadb',
  password: '12345',
  port: 5432,
});


pool.connect()
    .then(() => console.log('Conexión a PostgreSQL exitosa'))
    .catch(err => console.error('Error conectando a PostgreSQL', err));

// Middleware para proteger rutas
function verificarSesion(req, res, next) {
    if (req.session && req.session.usuario) {
        return next();
    }
    res.status(401).json({ error: 'No autorizado' });
}

// Middleware para restringir solo a admins
function isAdmin(req, res, next) {
    if (req.session.usuario?.rol === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'No eres administrador, no puedes eliminar.' });
}

// ==================== CHECK SESSION ====================
app.get('/api/check-session', (req, res) => {
    if (req.session && req.session.usuario) {
        res.json({ usuario: req.session.usuario });
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
});

// ==================== SERVIR PÁGINAS ====================
app.get('/', (req, res) => {
    if (req.session && req.session.usuario) {
        res.redirect('/frontend/index.html');
    } else {
        res.sendFile(path.join(__dirname, 'login', 'login.html'));
    }
});

// ✅ Servir archivos estáticos correctamente
app.use('/login', express.static(path.join(__dirname, 'login')));
app.use('/frontend', verificarSesion, express.static(path.join(__dirname, 'frontend')));


// ==================== LOGIN ====================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE username = $1',
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const usuario = result.rows[0];
        const valid = await bcrypt.compare(password, usuario.password);
        if (!valid) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // ✅ Guardamos toda la información en sesión
                req.session.usuario = {
            username: usuario.username,
            rol: usuario.rol,
            departamento: usuario.rol === "admin" ? "ADMIN" : usuario.departamento
        };


        res.json({ mensaje: 'Login exitoso', usuario: req.session.usuario });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el login' });
    }
});


// ==================== OLVIDAR CONTRASEÑA POR NÓMINA ====================
app.post('/api/forgot-password', async (req, res) => {
    const { nomina } = req.body;
    try {
        const user = await pool.query('SELECT * FROM usuarios WHERE nomina = $1', [nomina]);
        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Nómina no encontrada' });
        }

        const token = crypto.randomBytes(4).toString('hex'); // Token de 8 caracteres
        const expireTime = new Date(Date.now() + 15 * 60 * 1000); // Expira en 15 minutos

        await pool.query(
            'UPDATE usuarios SET reset_token = $1, reset_token_expire = $2 WHERE nomina = $3',
            [token, expireTime, nomina]
        );

        res.json({
            mensaje: 'Token generado. Úsalo para restablecer la contraseña.',
            token // ⚠ Solo para pruebas
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error generando token' });
    }
});

// ==================== RESTABLECER CONTRASEÑA POR NÓMINA ====================
app.post('/api/reset-password', async (req, res) => {
    const { nomina, token, password } = req.body;
    try {
        const user = await pool.query(
            'SELECT * FROM usuarios WHERE nomina = $1 AND reset_token = $2 AND reset_token_expire > NOW()',
            [nomina, token]
        );
        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'UPDATE usuarios SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE nomina = $2',
            [hashedPassword, nomina]
        );

        res.json({ mensaje: 'Contraseña restablecida con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error restableciendo contraseña' });
    }
});



// ==================== HELPER: Determinar sucursal activa ====================
function getDepartamento(req) {
  if (req.session.usuario.rol === "admin") {
    // 👇 Si el admin no seleccionó sucursal, usamos "ADMIN" como valor especial
    return req.session.usuario.sucursalSeleccionada || "ADMIN";
  }
  return req.session.usuario.departamento;
}


// ==================== CRUD EXPEDIENTES ====================

// ==================== CREAR NUEVO EXPEDIENTE ====================
app.post('/api/expedientes', verificarSesion, async (req, res) => {
  const {
    nombre_completo,
    fecha_nacimiento,
    edad,
    padecimientos,
    colonia,
    ciudad,
    telefono1,
    telefono2
  } = req.body;

  const depto = getDepartamento(req);

  try {
    // 📌 Buscar último número usado en esta sucursal
    const lastFolio = await pool.query(
      "SELECT COALESCE(MAX(numero_expediente), 0) + 1 AS next_id FROM expedientes WHERE departamento = $1",
      [depto]
    );
    const nextId = lastFolio.rows[0].next_id;

    // 📌 Insertar con folio único dentro de la sucursal
    const result = await pool.query(
      `INSERT INTO expedientes 
       (numero_expediente, nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2, departamento) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [nextId, nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2, depto]
    );

    res.json({ mensaje: "Expediente creado correctamente", expediente: result.rows[0] });
  } catch (err) {
    console.error("Error al crear expediente:", err);
    res.status(500).json({ error: "Error al crear expediente" });
  }
});

// ==================== OBTENER TODOS ====================
app.get('/api/expedientes', verificarSesion, async (req, res) => {
  try {
    const depto = getDepartamento(req);

    const result = await pool.query(
      "SELECT * FROM expedientes WHERE departamento = $1 ORDER BY numero_expediente ASC",
      [depto]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/expedientes:", err);
    res.status(500).json({ error: "Error al obtener expedientes" });
  }
});

// ==================== ACTUALIZAR EXPEDIENTE ====================
app.put('/api/expedientes/:id', verificarSesion, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const {
    nombre_completo,
    fecha_nacimiento,
    edad,
    padecimientos,
    colonia,
    ciudad,
    telefono1,
    telefono2
  } = req.body;

  const depto = getDepartamento(req);

  try {
    const result = await pool.query(
      `UPDATE expedientes 
       SET nombre_completo = $1,
           fecha_nacimiento = $2,
           edad = $3,
           padecimientos = $4,
           colonia = $5,
           ciudad = $6,
           telefono1 = $7,
           telefono2 = $8
       WHERE numero_expediente = $9 AND departamento = $10
       RETURNING *`,
      [nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2, id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    res.json({ mensaje: "Expediente actualizado correctamente", expediente: result.rows[0] });
  } catch (err) {
    console.error("Error al actualizar expediente:", err);
    res.status(500).json({ error: "Error al actualizar expediente" });
  }
});

// ==================== ELIMINAR EXPEDIENTE ====================
app.delete('/api/expedientes/:id', verificarSesion, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const depto = getDepartamento(req);

  try {
    const result = await pool.query(
      "DELETE FROM expedientes WHERE numero_expediente = $1 AND departamento = $2 RETURNING *",
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    res.json({ mensaje: "Expediente eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar expediente:", err);
    res.status(500).json({ error: "Error al eliminar expediente" });
  }
});

// ==================== OBTENER EXPEDIENTE POR ID ====================
app.get('/api/expedientes/:id', verificarSesion, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const depto = getDepartamento(req);

  try {
    const result = await pool.query(
      "SELECT * FROM expedientes WHERE numero_expediente = $1 AND departamento = $2",
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener expediente:", err);
    res.status(500).json({ error: "Error al obtener expediente" });
  }
});

// ==================== LISTA DE PACIENTES ====================
app.get('/api/pacientes', verificarSesion, async (req, res) => {
  try {
    const depto = getDepartamento(req);

    const result = await pool.query(
      "SELECT numero_expediente, nombre_completo FROM expedientes WHERE departamento = $1 ORDER BY nombre_completo ASC",
      [depto]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener pacientes:", err);
    res.status(500).json({ error: "Error al obtener pacientes" });
  }
});


// ==================== GUARDAR RECIBO ====================
app.post('/api/recibos', verificarSesion, async (req, res) => {
  const { fecha, paciente_id, procedimiento, precio, forma_pago, monto_pagado, tipo } = req.body;
  let depto = getDepartamento(req);

  try {
    // 📌 Buscar expediente en la sucursal/departamento actual
    const expediente = await pool.query(
      "SELECT numero_expediente FROM expedientes WHERE numero_expediente = $1 AND departamento = $2",
      [paciente_id, depto]
    );

    if (expediente.rows.length === 0) {
      return res.status(400).json({ error: "El paciente no existe en este departamento" });
    }

    // 📌 Usar el número de expediente como folio
    const folio = expediente.rows[0].numero_expediente;

    const result = await pool.query(
      `INSERT INTO recibos 
        (fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado, tipo, departamento) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado, tipo, depto]
    );

    res.json({ mensaje: "✅ Recibo guardado correctamente", recibo: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar recibo:", err);
    res.status(500).json({ error: "Error al guardar recibo" });
  }
});


// Listar recibos
app.get('/api/recibos', verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);

    const result = await pool.query(`
      SELECT r.id, r.fecha, r.folio, e.nombre_completo AS paciente,
             r.procedimiento, r.tipo, r.forma_pago, r.monto_pagado, r.precio, 
             (r.precio - r.monto_pagado) AS pendiente
      FROM recibos r
      JOIN expedientes e 
        ON r.paciente_id = e.numero_expediente 
       AND r.departamento = e.departamento
      WHERE r.departamento = $1
      ORDER BY r.fecha DESC
    `, [depto]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener recibos:", err);
    res.status(500).json({ error: "Error al obtener recibos" });
  }
});

// Eliminar recibo
app.delete('/api/recibos/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);
    const result = await pool.query(
      'DELETE FROM recibos WHERE id = $1 AND departamento = $2 RETURNING *',
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recibo no encontrado o no pertenece a este departamento" });
    }

    res.json({ mensaje: "Recibo eliminado" });
  } catch (err) {
    console.error("Error eliminando recibo:", err);
    res.status(500).json({ error: "Error eliminando recibo" });
  }
});



// ==================== CATÁLOGO DE PROCEDIMIENTOS ====================
app.get('/api/procedimientos', verificarSesion, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, precio FROM catalogo_procedimientos ORDER BY nombre"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error consultando procedimientos:", err);
    res.status(500).json({ error: "Error consultando procedimientos" });
  }
});



// ==================== MODULO MÉDICO ====================
// ==================== BUSCAR PACIENTE POR FOLIO ====================
app.get('/api/recibos/paciente/:folio', verificarSesion, async (req, res) => {
  const { folio } = req.params;

  // 📌 Determinar sucursal activa
  let depto = getDepartamento(req);

  try {
    const result = await pool.query(
      `SELECT e.numero_expediente AS folio, e.nombre_completo
       FROM expedientes e
       WHERE e.numero_expediente = $1 AND e.departamento = $2
       LIMIT 1`,
      [folio, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No se encontró paciente con ese folio" });
    }

    // ✅ devolver en el formato que espera el frontend
    res.json({
      id: result.rows[0].folio,                 // este será pacienteId en el frontend
      nombre_completo: result.rows[0].nombre_completo
    });
  } catch (err) {
    console.error("Error buscando paciente por folio:", err);
    res.status(500).json({ error: "Error al buscar paciente" });
  }
});

  

// ==================== PACIENTES PENDIENTES DE ATENDER ====================
app.get("/api/pendientes-medico", verificarSesion, async (req, res) => {
  // 📌 Determinar sucursal activa
  let depto = getDepartamento(req);

  try {
    const result = await pool.query(`
      SELECT 
          r.id AS recibo_id, 
          e.numero_expediente AS expediente_id,
          e.nombre_completo, 
          e.edad, 
          e.padecimientos,
          r.procedimiento
      FROM recibos r
      JOIN expedientes e 
        ON r.paciente_id = e.numero_expediente 
       AND r.departamento = e.departamento   -- 👈 asegura misma sucursal
      WHERE r.departamento = $1
        AND NOT EXISTS (
          SELECT 1 
          FROM ordenes_medicas o 
          WHERE o.folio_recibo = r.id         -- 👈 usar recibo en vez de expediente
            AND o.departamento = r.departamento
        )
    `, [depto]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/pendientes-medico:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== GUARDAR ORDEN MÉDICA ====================
app.post("/api/ordenes_medicas", verificarSesion, async (req, res) => {
  try {
    const {
      folio_recibo,
      medico,
      diagnostico,
      lado,
      procedimiento_id, 
      anexos,
      conjuntiva,
      cornea,
      camara_anterior,
      cristalino,
      retina,
      macula,
      nervio_optico,
      ciclopejia,
      hora_tp,
      problemas,
      plan
    } = req.body;

    let depto = getDepartamento(req);
  

    const reciboResult = await pool.query(
      `SELECT id, paciente_id, procedimiento, tipo, precio, monto_pagado 
       FROM recibos 
       WHERE id = $1 AND departamento = $2`,
      [folio_recibo, depto]
    );

    if (reciboResult.rows.length === 0) {
      return res.status(404).json({ error: "No se encontró el recibo en esta sucursal" });
    }

    const recibo = reciboResult.rows[0];

    const result = await pool.query(
      `INSERT INTO ordenes_medicas (
        expediente_id, folio_recibo, medico, diagnostico, lado, procedimiento, tipo,
        anexos, conjuntiva, cornea, camara_anterior, cristalino,
        retina, macula, nervio_optico, ciclopejia, hora_tp,
        problemas, plan, estatus, fecha, departamento
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,
        $18,$19,'Pendiente',NOW(),$20
      )
      RETURNING *`,
      [
        recibo.paciente_id, // expediente_id = numero_expediente
        recibo.id,          // folio_recibo = id de recibo
        medico, diagnostico, lado,
        recibo.procedimiento, recibo.tipo,
        anexos, conjuntiva, cornea, camara_anterior, cristalino,
        retina, macula, nervio_optico, ciclopejia, hora_tp,
        problemas, plan, depto
      ]
    );

    res.json({ mensaje: "Orden médica creada correctamente", orden: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar orden médica:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ÓRDENES POR EXPEDIENTE ====================
app.get("/api/expedientes/:id/ordenes", verificarSesion, async (req, res) => {
  try {
    const { id } = req.params;

    let depto = getDepartamento(req);


    const result = await pool.query(`
      SELECT 
        o.id AS numero_orden,
        o.medico,
        o.diagnostico,
        o.lado,
        o.procedimiento,
        r.precio,
        r.monto_pagado AS pagado,
        (r.precio - r.monto_pagado) AS pendiente,
        o.estatus,
        o.fecha,
        o.anexos,
        o.conjuntiva,
        o.cornea,
        o.camara_anterior,
        o.cristalino,
        o.retina,
        o.macula,
        o.nervio_optico,
        o.ciclopejia,
        o.hora_tp,
        o.problemas,
        o.plan
      FROM ordenes_medicas o
      JOIN recibos r 
        ON r.id = o.folio_recibo 
       AND r.departamento = o.departamento
      JOIN expedientes e
        ON e.numero_expediente = o.expediente_id   -- 👈 corregido
       AND e.departamento = o.departamento
      WHERE o.expediente_id = $1 AND o.departamento = $2
      ORDER BY o.fecha DESC
    `, [id, depto]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/expedientes/:id/ordenes:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== LISTAR TODAS LAS ÓRDENES ====================
app.get("/api/ordenes_medicas", verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);
    
    const result = await pool.query(`
      SELECT 
        e.numero_expediente AS numero_orden,   -- 👈 Ahora usa el expediente del paciente
        e.nombre_completo AS paciente, 
        o.medico, 
        o.diagnostico, 
        o.lado, 
        o.procedimiento, 
        o.tipo,
        r.precio,              
        r.monto_pagado AS pagado,
        (r.precio - r.monto_pagado) AS pendiente,
        o.estatus,
        o.fecha
      FROM ordenes_medicas o
      JOIN recibos r 
        ON r.id = o.folio_recibo 
       AND r.departamento = o.departamento
      JOIN expedientes e 
        ON e.numero_expediente = o.expediente_id   -- 👈 Correcto: une con expediente
       AND e.departamento = o.departamento
      WHERE o.departamento = $1
      ORDER BY o.fecha DESC
    `, [depto]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/ordenes_medicas:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PAGOS ====================
// Registrar un pago para una orden (usando folio_recibo en lugar de orden_id)
app.post("/api/pagos", verificarSesion, async (req, res) => {
  const client = await pool.connect();
  let depto = getDepartamento(req);

  try {
    const { folio_recibo, monto, forma_pago } = req.body; // 👈 ahora recibimos folio_recibo

    await client.query("BEGIN");

    // 1. Obtener la orden médica vinculada a ese recibo
    const ordenResult = await client.query(
      `SELECT o.id, o.expediente_id, o.estatus
       FROM ordenes_medicas o
       WHERE o.folio_recibo = $1 AND o.departamento = $2`,
      [folio_recibo, depto]
    );

    if (ordenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Orden no encontrada para este recibo" });
    }

    const orden = ordenResult.rows[0];

    // 2. Registrar el pago
    const pagoResult = await client.query(
      `INSERT INTO pagos (orden_id, expediente_id, monto, forma_pago, fecha, departamento)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING *`,
      [orden.id, orden.expediente_id, monto, forma_pago, depto]
    );

    // 3. Calcular total pagado hasta ahora
    const sumaPagos = await client.query(
      `SELECT COALESCE(SUM(monto),0) AS total_pagado
       FROM pagos
       WHERE orden_id = $1 AND departamento = $2`,
      [orden.id, depto]
    );
    const totalPagado = parseFloat(sumaPagos.rows[0].total_pagado);

    // 4. Obtener el recibo asociado
    const precioOrden = await client.query(
      `SELECT id, precio 
       FROM recibos
       WHERE id = $1 AND departamento = $2`,
      [folio_recibo, depto]
    );

    if (precioOrden.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Recibo no encontrado" });
    }

    const recibo = precioOrden.rows[0];
    const precio = parseFloat(recibo.precio || 0);
    const pendiente = Math.max(0, precio - totalPagado);

    // 5. Actualizar acumulados en recibo
    await client.query(
      `UPDATE recibos
       SET monto_pagado = $1
       WHERE id = $2 AND departamento = $3`,
      [totalPagado, recibo.id, depto]
    );

    // 6. Actualizar estatus de la orden
    await client.query(
      `UPDATE ordenes_medicas
       SET estatus = CASE WHEN $1 = 0 THEN 'Pagado' ELSE 'Pendiente' END
       WHERE id = $2 AND departamento = $3`,
      [pendiente, orden.id, depto]
    );

    await client.query("COMMIT");

    res.json({
      message: "Pago registrado con éxito",
      pago: pagoResult.rows[0],
      totalPagado,
      pendiente
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error en /api/pagos:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


// ==================== CIERRE DE CAJA ====================
app.get("/api/cierre-caja", verificarSesion, async (req, res) => {
  try {
    const { fecha } = req.query;
   let depto = getDepartamento(req);
    let params = [fecha];

    if (!fecha) {
      return res.status(400).json({ error: "Falta fecha" });
    }

    let query = `
      SELECT 
          p.forma_pago AS pago,
          o.procedimiento,
          SUM(p.monto) AS total
      FROM pagos p
      JOIN ordenes_medicas o ON o.id = p.orden_id
      WHERE p.fecha::date = $1
    `;

    if (req.session.usuario.rol === "admin") {
      if (req.session.usuario.sucursalSeleccionada) {
        // 👇 Admin viendo una sucursal
        query += " AND p.departamento = $2";
        params.push(req.session.usuario.sucursalSeleccionada);
      } else {
        // 👇 Admin en su propia ventana → solo sus registros en depto = 'ADMIN'
        query += " AND p.departamento = $2";
        params.push("ADMIN");
      }
    } else {
      // Usuario normal
      query += " AND p.departamento = $2";
      params.push(depto);
    }

    query += " GROUP BY p.forma_pago, o.procedimiento ORDER BY p.forma_pago, o.procedimiento";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/cierre-caja:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== LISTADO DE PACIENTES ====================
app.get("/api/listado-pacientes", verificarSesion, async (req, res) => {
  try {
    const { fecha } = req.query;
    let depto = getDepartamento(req);
    let params = [fecha];

    if (!fecha) {
      return res.status(400).json({ error: "Falta fecha" });
    }

    let query = `
      SELECT 
          p.fecha::date AS fecha,
          o.id AS orden_id,
          e.numero_expediente AS folio,
          e.nombre_completo AS nombre,
          o.procedimiento,
          CASE 
            WHEN (SUM(p.monto) < r.precio) THEN 'Pago Pendiente'
            ELSE 'Pagado'
          END AS status,
          STRING_AGG(DISTINCT p.forma_pago, ', ') AS pago,
          r.precio AS total,
          (r.precio - COALESCE(SUM(p.monto),0)) AS saldo
      FROM ordenes_medicas o
      JOIN recibos r ON r.id = o.folio_recibo
      JOIN expedientes e ON o.expediente_id = e.numero_expediente
      LEFT JOIN pagos p ON p.orden_id = o.id
      WHERE p.fecha::date = $1
    `;

    if (req.session.usuario.rol === "admin") {
      if (req.session.usuario.sucursalSeleccionada) {
        query += " AND o.departamento = $2";
        params.push(req.session.usuario.sucursalSeleccionada);
      } else {
        query += " AND o.departamento = $2";
        params.push("ADMIN");
      }
    } else {
      query += " AND o.departamento = $2";
      params.push(depto);
    }

    query += `
      GROUP BY p.fecha::date, o.id, e.numero_expediente, e.nombre_completo, o.procedimiento, r.precio
      ORDER BY p.fecha, o.id
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/listado-pacientes:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== ADMIN: Selección de sucursal ====================
app.post("/api/seleccionar-sucursal", verificarSesion, (req, res) => {
  if (req.session.usuario.rol !== "admin") {
    return res.status(403).json({ error: "No autorizado" });
  }
  const { sucursal } = req.body;
  if (!sucursal) {
    return res.status(400).json({ error: "Debe indicar la sucursal" });
  }
  req.session.usuario.sucursalSeleccionada = sucursal;
  res.json({ ok: true, sucursal });
});

// ==================== MÓDULO OPTOMETRÍA ====================
// Guardar nueva evaluación de optometría
app.post("/api/optometria", verificarSesion, async (req, res) => {
  try {
    const {
      expediente_id,
      esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
      esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
      bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi
    } = req.body;

    let depto = getDepartamento(req);

    const result = await pool.query(
      `INSERT INTO optometria (
        expediente_id, esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
        esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
        bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi, fecha, departamento
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, NOW(), $20)
      RETURNING *`,
      [
        expediente_id,
        esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
        esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
        bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi,
        depto
      ]
    );

    res.json({ mensaje: "✅ Optometría guardada con éxito", data: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar optometría:", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todas las evaluaciones de optometría (con nombre de paciente)
app.get("/api/optometria", verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);

    const result = await pool.query(
      `SELECT o.*, e.nombre_completo AS nombre
       FROM optometria o
       JOIN expedientes e 
         ON o.expediente_id = e.numero_expediente 
        AND o.departamento = e.departamento
       WHERE o.departamento = $1
       ORDER BY o.fecha DESC`,
      [depto]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/optometria:", err);
    res.status(500).json({ error: "Error al obtener registros de optometría" });
  }
});

// Obtener las evaluaciones de optometría de un expediente específico
app.get("/api/expedientes/:id/optometria", verificarSesion, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);

    const result = await pool.query(
      `SELECT *
       FROM optometria
       WHERE expediente_id = $1 AND departamento = $2
       ORDER BY fecha DESC`,
      [id, depto]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/expedientes/:id/optometria:", err);
    res.status(500).json({ error: "Error al obtener optometría del expediente" });
  }
});

// Eliminar evaluación de optometría
app.delete("/api/optometria/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);

    const result = await pool.query(
      "DELETE FROM optometria WHERE id = $1 AND departamento = $2 RETURNING *",
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Evaluación no encontrada o no pertenece a tu sucursal" });
    }

    res.json({ mensaje: "🗑️ Evaluación de optometría eliminada" });
  } catch (err) {
    console.error("Error al eliminar optometría:", err);
    res.status(500).json({ error: err.message });
  }
});



// ==================== MÓDULO INSUMOS ====================

// Configuración de multer para guardar con nombre único
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads')); // carpeta uploads
  },
  filename: function (req, file, cb) {
    // agrega timestamp al nombre para evitar duplicados
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Servir los archivos subidos para poder descargarlos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. Guardar insumo manual
app.post('/api/insumos', verificarSesion, async (req, res) => {
  try {
    const { fecha, folio, concepto, monto, archivo } = req.body;
    let depto = getDepartamento(req);  // ✅ ahora siempre usa la misma función

    const result = await pool.query(
      `INSERT INTO insumos (fecha, folio, concepto, monto, archivo, departamento) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [fecha, folio, concepto, monto, archivo || null, depto]
    );

    res.json({ mensaje: '✅ Insumo agregado', insumo: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar insumo:", err);
    res.status(500).json({ error: 'Error al guardar insumo' });
  }
});

// 2. Listar insumos
app.get('/api/insumos', verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);  // ✅ unificado

    const result = await pool.query(
      'SELECT * FROM insumos WHERE departamento = $1 ORDER BY fecha ASC',
      [depto]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener insumos:", err);
    res.status(500).json({ error: 'Error al obtener insumos' });
  }
});

// 3. Subir Excel
app.post('/api/insumos/upload', verificarSesion, upload.single('excelFile'), async (req, res) => {
  try {
    let depto = getDepartamento(req);  // ✅ unificado

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    for (let row of data) {
      // Convertir fecha si viene como número de Excel
      let fecha = row.Fecha;
      if (typeof fecha === "number") {
        fecha = xlsx.SSF.format("yyyy-mm-dd", fecha);
      }

      await pool.query(
        `INSERT INTO insumos (fecha, folio, concepto, monto, archivo, departamento) 
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [fecha, row.Folio || null, row.Concepto || null, row.Monto || 0, req.file.filename, depto]
      );
    }

    res.json({ mensaje: '✅ Excel procesado y guardado' });
  } catch (err) {
    console.error("Error procesando Excel:", err);
    res.status(500).json({ error: 'Error procesando Excel' });
  }
});

// 4. Eliminar insumo
app.delete('/api/insumos/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);  // ✅ unificado

    const result = await pool.query(
      "DELETE FROM insumos WHERE id = $1 AND departamento = $2 RETURNING *",
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Insumo no encontrado o no pertenece a tu sucursal" });
    }

    res.json({ mensaje: "🗑️ Insumo eliminado correctamente" });
  } catch (err) {
    console.error("Error eliminando insumo:", err);
    res.status(500).json({ error: "Error eliminando insumo" });
  }
});


//==================== MÓDULO CREAR USUARIO ADMIN ====================//
// Crear usuario
app.post('/api/admin/add-user', isAdmin, async (req, res) => {
    const { nomina, username, password, rol, departamento } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuarios (nomina, username, password, rol, departamento) VALUES ($1,$2,$3,$4,$5)',
            [nomina, username, hashedPassword, rol, departamento]
        );
        res.json({ mensaje: 'Usuario creado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando usuario' });
    }
});

// Listar usuarios
app.get('/api/admin/list-users', isAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT nomina, username, rol, departamento FROM usuarios ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error listando usuarios' });
    }
});

// ==================== ADMIN CAMBIE DE SUCURSAL ====================
// Cambiar sucursal activa (solo admin)
app.post('/api/set-departamento', isAdmin, (req, res) => {
  const { departamento } = req.body;
  if (!departamento) {
    return res.status(400).json({ error: 'Falta el nombre del departamento' });
  }

  if (departamento === "admin") {
    // 👉 Regresa al modo admin sin sucursal activa
    delete req.session.usuario.sucursalSeleccionada;
    return res.json({ mensaje: "Regresaste al panel de Admin" });
  }

  // 👉 Guardamos la sucursal activa aparte, sin perder rol ni datos originales
  req.session.usuario.sucursalSeleccionada = departamento;
  res.json({ mensaje: `Sucursal cambiada a ${departamento}` });
});




// ==================== LOGOUT ====================
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login/login.html');
    });
});

app.listen(3000, "0.0.0.0", () => {
    console.log("Servidor corriendo en puerto 3000 en todas las interfaces");
});

/*
app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});*/