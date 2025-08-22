const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');

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
/*const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Optavision',
    password: '12345',
    port: 5432
});*/

//este es para la base en linea
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
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
    const { id } = req.params;
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
    const { id } = req.params;

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
    const { id } = req.params;

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

// ==================== GUARDAR ORDEN MÉDICA  ====================
app.post("/api/ordenes_medicas", async (req, res) => {
  try {
    const { expediente_id, folio_recibo, medico, diagnostico, lado } = req.body;

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

    // 📌 Insertar la orden médica (procedimiento ahora es texto)
    const result = await pool.query(
      `INSERT INTO ordenes_medicas 
       (expediente_id, folio_recibo, medico, diagnostico, lado, procedimiento, status, fecha)
       VALUES ($1,$2,$3,$4,$5,$6,'Pendiente',NOW())
       RETURNING *`,
      [
        expediente_id,
        folio_recibo,
        medico,
        diagnostico,
        lado,
        recibo.procedimiento   // aquí ya entra como texto: "Consulta", "Cirugía de Catarata"
      ]
    );

    res.json({ mensaje: "Orden médica creada correctamente", orden: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar orden médica:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== LISTAR PROCEDIMIENTOS ====================
app.get("/api/procedimientos", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nombre, precio FROM catalogo_procedimientos ORDER BY nombre");
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener procedimientos:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== LISTAR TODAS LAS ÓRDENES ====================
app.get("/api/ordenes_medicas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id AS numero_orden,   -- usamos el ID como número de orden
        e.nombre_completo AS paciente, 
        o.medico, 
        o.diagnostico, 
        o.lado, 
        o.procedimiento,       
        r.precio,              
        r.monto_pagado AS pagado,   -- pagado
        r.pendiente,                -- pendiente
        o.fecha,
        CASE 
          WHEN o.status = 'Pagado' THEN 'Pagado'
          WHEN r.pendiente = 0 THEN 'Pagado'
          ELSE 'Pago Pendiente'
        END AS status
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

// ==================== MARCAR ORDEN COMO PAGADA ====================
app.put("/api/ordenes_medicas/:id/pagar", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ordenes_medicas 
       SET status = 'Pagado' 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    res.json({ mensaje: "Orden pagada correctamente", orden: result.rows[0] });
  } catch (err) {
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
        o.procedimiento,            -- texto directo
        r.precio,                   -- precio viene del recibo
        r.monto_pagado AS pagado,
        r.pendiente,
        o.status,
        o.fecha
      FROM ordenes_medicas o
      JOIN recibos r ON r.id = o.folio_recibo
      JOIN expedientes e ON o.expediente_id = e.numero_expediente
      WHERE e.numero_expediente = $1
      ORDER BY o.fecha DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/expedientes/:id/ordenes:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== LISTADO ÓRDENES MÉDICAS ====================
app.get("/api/ordenes_medicas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.numero_orden, e.nombre as paciente, o.medico, 
             o.diagnostico, o.lado, o.procedimiento, o.status, o.fecha,
             r.precio, r.pagado, r.pendiente
      FROM ordenes_medicas o
      JOIN recibos r ON r.id = o.folio_recibo
      JOIN expedientes e ON e.id = r.expediente_id
      ORDER BY o.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/ordenes_medicas:", err);
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

    // 2. Actualizar solo lo permitido
    await client.query(
      `UPDATE recibos 
       SET monto_pagado = $1, forma_pago = $2
       WHERE id = $3`,
      [nuevoPagado, forma_pago, orden.folio_recibo]
    );

    // 3. Verificar si ya quedó en cero el pendiente (calculado automáticamente)
    const checkRecibo = await client.query(
      `SELECT pendiente FROM recibos WHERE id = $1`,
      [orden.folio_recibo]
    );

    const pendienteFinal = parseFloat(checkRecibo.rows[0].pendiente);

    if (pendienteFinal === 0) {
      await client.query(
        `UPDATE ordenes_medicas 
         SET status = 'Pagado'
         WHERE id = $1`,
        [orden_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Pago registrado con éxito", pagado: nuevoPagado, pendiente: pendienteFinal });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error en /api/pagos:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================== RUTA TEMPORAL PARA CREAR ADMIN ====================
app.get("/crear-admin", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash("12345", 10); // contraseña por defecto
        await pool.query(
            "INSERT INTO usuarios (nomina, username, password) VALUES ($1, $2, $3)",
            ["A001", "admin", hashedPassword]
        );
        res.send("✅ Usuario admin creado (usuario: admin / pass: 12345)");
    } catch (err) {
        console.error("Error creando admin:", err);
        res.status(500).send("Error creando admin: " + err.message);
    }
});



// ==================== LOGOUT ====================
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login/login.html');
    });
});

app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});
