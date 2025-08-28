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

// PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Optavision',
    password: '12345',
    port: 5432
});

//este es para la base en linea
/*const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
*/

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

// ==================== RUTA TEMPORAL PARA CREAR USUARIOS ====================
app.post('/api/admin/add-user', async (req, res) => {
    const { nomina, username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuarios (nomina, username, password) VALUES ($1, $2, $3)',
            [nomina, username, hashedPassword]
        );
        res.json({ mensaje: 'Usuario creado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando usuario' });
    }
});

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
        req.session.usuario = username;
        res.json({ mensaje: 'Login exitoso' });
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

    try {
        const result = await pool.query(
            `INSERT INTO expedientes 
             (nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2) 
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) 
             RETURNING numero_expediente, nombre_completo, edad, padecimientos, colonia, ciudad, telefono1, telefono2`,
            [nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2]
        );

        res.json({ mensaje: "Expediente creado correctamente", expediente: result.rows[0] });
    } catch (err) {
        console.error("Error al crear expediente:", err);
        res.status(500).json({ error: "Error al crear expediente" });
    }
});

// Obtener todos
app.get('/api/expedientes', verificarSesion, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM expedientes ORDER BY numero_expediente ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener expedientes" });
    }
});

// Actualizar expediente
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
             WHERE numero_expediente = $9
             RETURNING *`,
            [nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2, id]
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

// Eliminar expediente
app.delete('/api/expedientes/:id', verificarSesion, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
    }

    try {
        const result = await pool.query(
            "DELETE FROM expedientes WHERE numero_expediente = $1 RETURNING *",
            [id]
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

// Obtener expediente por ID (numero_expediente)
app.get('/api/expedientes/:id', verificarSesion, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM expedientes WHERE numero_expediente = $1",
            [id]
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
app.get('/api/pacientes', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT numero_expediente, nombre_completo FROM expedientes ORDER BY nombre_completo ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener pacientes:", err);
        res.status(500).json({ error: "Error al obtener pacientes" });
    }
});

// ==================== RECIBOS ====================

// Guardar recibo
app.post('/api/recibos', verificarSesion, async (req, res) => {
    const { fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO recibos (fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado]
        );

        res.json({ mensaje: "Recibo guardado correctamente", recibo: result.rows[0] });
    } catch (err) {
        console.error("Error al guardar recibo:", err);
        res.status(500).json({ error: "Error al guardar recibo" });
    }
});

// Listar recibos
app.get('/api/recibos', verificarSesion, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.id, r.fecha, r.folio, e.nombre_completo AS paciente,
                   r.procedimiento, r.forma_pago, r.monto_pagado, r.precio, r.pendiente
            FROM recibos r
            JOIN expedientes e ON r.paciente_id = e.numero_expediente
            ORDER BY r.fecha DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener recibos:", err);
        res.status(500).json({ error: "Error al obtener recibos" });
    }
});


// Eliminar recibo
app.delete('/api/recibos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM recibos WHERE id = $1', [id]);
        res.json({ mensaje: "Recibo eliminado" });
    } catch (err) {
        console.error("Error eliminando recibo:", err);
        res.status(500).json({ error: "Error eliminando recibo" });
    }
});

// ==================== BUSCAR PACIENTE POR FOLIO ====================
app.get('/api/recibos/paciente/:folio', async (req, res) => {
    const { folio } = req.params;
    try {
        const result = await pool.query(
            `SELECT e.numero_expediente AS id, e.nombre_completo
             FROM expedientes e
             WHERE e.numero_expediente = $1
             LIMIT 1`,
            [folio]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No se encontró paciente con ese folio" });
        }

        res.json(result.rows[0]); 
    } catch (err) {
        console.error("Error buscando paciente por folio:", err);
        res.status(500).json({ error: "Error al buscar paciente" });
    }
});

// ==================== MODULO MÉDICO ====================
// Pacientes pendientes de atender
app.get("/api/pendientes-medico", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
          r.id AS recibo_id, 
          e.numero_expediente AS expediente_id,   -- 👈 corregido
          e.nombre_completo, 
          e.edad, 
          e.padecimientos,
          r.procedimiento
      FROM recibos r
      JOIN expedientes e ON r.paciente_id = e.numero_expediente   -- 👈 corregido
      WHERE NOT EXISTS (
          SELECT 1 FROM ordenes_medicas o WHERE o.folio_recibo = r.id
      )
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/pendientes-medico:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== MODULO DE ÓRDENES ========================================
// ==================== GUARDAR ORDEN MÉDICA ====================
app.post("/api/ordenes_medicas", async (req, res) => {
  try {
    const {
      expediente_id,
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

    // 📌 Buscar el recibo relacionado
    const reciboResult = await pool.query(
      `SELECT procedimiento, precio, monto_pagado, pendiente 
       FROM recibos 
       WHERE id = $1`,
      [folio_recibo]
    );

    if (reciboResult.rows.length === 0) {
      return res.status(404).json({ error: "No se encontró el recibo" });
    }

    const recibo = reciboResult.rows[0];

    // 📌 Insertar la orden médica con campos clínicos
       const result = await pool.query(
      `INSERT INTO ordenes_medicas (
        expediente_id, folio_recibo, medico, diagnostico, lado, procedimiento, 
        anexos, conjuntiva, cornea, camara_anterior, cristalino,
        retina, macula, nervio_optico, ciclopejia, hora_tp,
        problemas, plan, estatus, fecha
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,'Pendiente',NOW()
      )
      RETURNING *`,

      [
        expediente_id, folio_recibo, medico, diagnostico, lado, recibo.procedimiento,
        anexos, conjuntiva, cornea, camara_anterior, cristalino,
        retina, macula, nervio_optico, ciclopejia, hora_tp,
        problemas, plan
      ]
    );

    res.json({ mensaje: "Orden médica creada correctamente", orden: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar orden médica:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== ÓRDENES POR EXPEDIENTE ====================
app.get("/api/expedientes/:id/ordenes", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        o.id AS numero_orden,
        o.medico,
        o.diagnostico,
        o.lado,
        o.procedimiento,
        r.precio,
        r.monto_pagado AS pagado,
        r.pendiente,
        o.estatus,
        o.fecha,
        -- 🔽 CAMPOS CLÍNICOS
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
      JOIN recibos r ON r.id = o.folio_recibo
      WHERE o.expediente_id = $1
      ORDER BY o.fecha DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/expedientes/:id/ordenes:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== LISTAR TODAS LAS ÓRDENES ====================
app.get("/api/ordenes_medicas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id AS numero_orden,
        e.nombre_completo AS paciente, 
        o.medico, 
        o.diagnostico, 
        o.lado, 
        o.procedimiento,       
        r.precio,              
        r.monto_pagado AS pagado,
        r.pendiente,
        o.estatus,
        o.fecha,
        -- 🔽 CAMPOS CLÍNICOS
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
      JOIN recibos r ON r.id = o.folio_recibo
      JOIN expedientes e ON e.numero_expediente = o.expediente_id
      ORDER BY o.fecha DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/ordenes_medicas:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== LISTAR PROCEDIMIENTOS ====================
app.get("/api/procedimientos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, precio 
      FROM catalogo_procedimientos   -- 👈 corregido
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/procedimientos:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== PAGOS ====================

// Registrar un pago para una orden
app.post("/api/pagos", async (req, res) => {
  const client = await pool.connect();
  try {
    const { orden_id, monto, forma_pago } = req.body;

    await client.query("BEGIN");

    // 1. Obtener la orden y su recibo
    const ordenResult = await client.query(
      `SELECT o.id, o.folio_recibo, r.monto_pagado, r.precio, r.pendiente
       FROM ordenes_medicas o
       JOIN recibos r ON r.id = o.folio_recibo
       WHERE o.id = $1`,
      [orden_id]
    );

    if (ordenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const orden = ordenResult.rows[0];
    let nuevoPagado = parseFloat(orden.monto_pagado) + parseFloat(monto);

    // 2. Actualizar el recibo
    await client.query(
      `UPDATE recibos 
       SET monto_pagado = $1, forma_pago = $2
       WHERE id = $3`,
      [nuevoPagado, forma_pago, orden.folio_recibo]
    );

    // 3. Verificar si ya quedó en cero el pendiente
    const checkRecibo = await client.query(
      `SELECT pendiente FROM recibos WHERE id = $1`,
      [orden.folio_recibo]
    );

    const pendienteFinal = parseFloat(checkRecibo.rows[0].pendiente);

    // ⚡️ CORREGIDO: usar "estatus" en lugar de "status"
    if (pendienteFinal === 0) {
      await client.query(
        `UPDATE ordenes_medicas 
         SET estatus = 'Pagado'
         WHERE id = $1`,
        [orden_id]
      );
    }

    await client.query("COMMIT");
    res.json({
      message: "Pago registrado con éxito",
      pagado: nuevoPagado,
      pendiente: pendienteFinal
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

// Resumen por forma de pago y procedimiento
app.get("/api/cierre-caja", async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({ error: "Falta fecha" });
    }

    const result = await pool.query(`
      SELECT 
          r.forma_pago AS pago,
          r.procedimiento,
          SUM(r.precio) AS total
      FROM recibos r
      WHERE DATE(r.fecha) = $1
      GROUP BY r.forma_pago, r.procedimiento
      ORDER BY r.forma_pago, r.procedimiento
    `, [fecha]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/cierre-caja:", err);
    res.status(500).json({ error: err.message });
  }
});

// Listado de pacientes con recibos de ese día
app.get("/api/listado-pacientes", async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({ error: "Falta fecha" });
    }

    const result = await pool.query(`
      SELECT 
          r.fecha::date AS fecha,
          r.id AS folio,
          e.nombre_completo AS nombre,
          r.procedimiento,
          CASE 
            WHEN (r.precio - r.monto_pagado) > 0 THEN 'Pago Pendiente'
            ELSE 'Pagado'
          END AS status,
          r.forma_pago AS pago,
          r.precio AS total,
          (r.precio - r.monto_pagado) AS saldo
      FROM recibos r
      JOIN expedientes e ON r.paciente_id = e.numero_expediente
      WHERE DATE(r.fecha) = $1
      ORDER BY r.fecha, r.id
    `, [fecha]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/listado-pacientes:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== MÓDULO OPTOMETRÍA ====================

// Guardar nueva evaluación de optometría
app.post("/api/optometria", async (req, res) => {
  try {
    const {
      expediente_id,
      esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
      esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
      bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi
    } = req.body;

    const result = await pool.query(
      `INSERT INTO optometria (
        expediente_id, esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
        esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
        bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi, fecha
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, NOW())
      RETURNING *`,
      [
        expediente_id,
        esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
        esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
        bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi
      ]
    );

    res.json({ mensaje: "✅ Optometría guardada con éxito", data: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar optometría:", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todas las evaluaciones de optometría (con nombre de paciente)
app.get("/api/optometria", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, e.nombre_completo AS nombre
      FROM optometria o
      JOIN expedientes e ON o.expediente_id = e.numero_expediente
      ORDER BY o.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/optometria:", err);
    res.status(500).json({ error: "Error al obtener registros de optometría" });
  }
});

// Obtener las evaluaciones de optometría de un expediente específico
app.get("/api/expedientes/:id/optometria", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT *
      FROM optometria
      WHERE expediente_id = $1
      ORDER BY fecha DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/expedientes/:id/optometria:", err);
    res.status(500).json({ error: "Error al obtener optometría del expediente" });
  }
});

// Eliminar evaluación de optometría
app.delete("/api/optometria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM optometria WHERE id = $1", [id]);
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
app.post('/api/insumos', async (req, res) => {
  try {
    const { fecha, medicamento, cantidad } = req.body;
    const result = await pool.query(
      'INSERT INTO insumos (fecha, nombre, cantidad) VALUES ($1, $2, $3) RETURNING *',
      [fecha, medicamento, cantidad]
    );
    res.json({ mensaje: '✅ Insumo agregado', insumo: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar insumo:", err);
    res.status(500).json({ error: 'Error al guardar insumo' });
  }
});

// 2. Listar insumos
app.get('/api/insumos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insumos ORDER BY fecha ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener insumos:", err);
    res.status(500).json({ error: 'Error al obtener insumos' });
  }
});

// 3. Subir Excel
app.post('/api/insumos/upload', upload.single('excelFile'), async (req, res) => {
  try {
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
        'INSERT INTO insumos (fecha, nombre, cantidad, archivo) VALUES ($1,$2,$3,$4)',
        [fecha, row.Medicamento, row.Cantidad, req.file.filename]  // 👈 guarda el filename real
      );
    }

    res.json({ mensaje: 'Excel procesado y guardado' });
  } catch (err) {
    console.error("Error procesando Excel:", err);
    res.status(500).json({ error: 'Error procesando Excel' });
  }
});

// 4. Eliminar insumo
app.delete('/api/insumos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM insumos WHERE id = $1", [id]);
    res.json({ mensaje: "🗑️ Insumo eliminado correctamente" });
  } catch (err) {
    console.error("Error eliminando insumo:", err);
    res.status(500).json({ error: "Error eliminando insumo" });
  }
});


// Servir carpeta de uploads como pública
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ==================== LOGOUT ====================
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login/login.html');
    });
});

app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});
