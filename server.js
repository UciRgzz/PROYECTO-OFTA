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
    origin: "https://oftavision.shop",  
    credentials: true
}));

app.use(bodyParser.json());




// Sesiones
app.set('trust proxy', 1); //necesario en producción detrás de proxy/https
app.use(session({
    secret: 'mi_secreto_super_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production", // true solo en producción
        httpOnly: true,
        sameSite: "lax",
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

// ==================== MIDDLEWARE ====================
// Proteger rutas con sesión
function verificarSesion(req, res, next) {
    if (req.session && req.session.usuario) {
        return next();
    }
    // si no tiene sesión, redirigir a login
    return res.redirect('/login/login.html');
}


// Restringir solo a admins
function isAdmin(req, res, next) {
    if (req.session.usuario?.rol === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'No eres administrador, no puedes eliminar.' });
}

// ==================== FUNCIÓN: Fecha y hora local México ====================
function fechaHoraLocalMX() {
  const now = new Date();
  
  // Forzar la hora de México (sin desfase UTC)
  const opciones = {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  // Generar formato compatible con PostgreSQL (YYYY-MM-DD HH:mm:ss)
  const fechaFormateada = new Intl.DateTimeFormat("en-CA", opciones)
    .format(now)
    .replace(",", "");

  // Cambiar la "T" por un espacio para formato SQL estándar
  return fechaFormateada.replace("T", " ");
}

// ==================== FUNCIÓN: Fecha local México (solo fecha yyyy-mm-dd) ====================
function fechaLocalMX() {
  const now = new Date();
  const opciones = {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  };

  const fechaFormateada = new Intl.DateTimeFormat("en-CA", opciones).format(now);
  return fechaFormateada; // Ejemplo: 2025-10-08
}




// ==================== CHECK SESSION ====================
app.get('/api/check-session', (req, res) => {
    if (req.session && req.session.usuario) {
        res.json({ usuario: req.session.usuario });
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
});

// ==================== NOTIFICACIONES ====================

// Obtener notificaciones
app.get("/api/notificaciones", verificarSesion, async (req, res) => {
  try {
    const user = req.session.usuario?.username || "desconocido";
    const rol = req.session.usuario?.rol || "usuario";

    let result;
    if (rol === "admin") {
      // Admin ve todas
      result = await pool.query(
        "SELECT id, mensaje, usuario, fecha FROM notificaciones ORDER BY fecha DESC LIMIT 50"
      );
    } else {
      // Usuario normal solo ve las suyas
      result = await pool.query(
        "SELECT id, mensaje, usuario, fecha FROM notificaciones WHERE usuario = $1 ORDER BY fecha DESC LIMIT 20",
        [user]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo notificaciones:", err);
    res.status(500).json({ error: "No se pudieron cargar las notificaciones" });
  }
});

// Registrar cuando un usuario cambia su contraseña
app.post("/api/notificacion/cambio-password", verificarSesion, async (req, res) => {
  try {
    const user = req.session.usuario?.username || "desconocido";
    await pool.query(
  "INSERT INTO notificaciones (mensaje, usuario, fecha) VALUES ($1, $2, $3)",
  [`🔑 El usuario ${user} cambió su contraseña`, user, fechaHoraLocalMX()]
);

    res.json({ ok: true });
  } catch (err) {
    console.error("Error registrando notificación de contraseña:", err);
    res.status(500).json({ error: "No se pudo registrar notificación" });
  }
});

// Registrar cuando un admin crea un usuario nuevo
app.post("/api/notificacion/nuevo-usuario", isAdmin, async (req, res) => {
  try {
    const { nuevo } = req.body;
    if (!nuevo) {
      return res.status(400).json({ error: "Falta nombre del nuevo usuario" });
    }

    await pool.query(
      "INSERT INTO notificaciones (mensaje, usuario) VALUES ($1, $2)",
      [`👤 Se creó un nuevo usuario: ${nuevo}`, nuevo]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error registrando notificación de nuevo usuario:", err);
    res.status(500).json({ error: "No se pudo registrar notificación" });
  }
});


// ==================== LOGOUT ====================
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login/login.html');
    });
});

// ==================== SERVIR PÁGINAS ====================

// ⚠️ Solo login es público
app.use('/login', express.static(path.join(__dirname, 'login')));

//Redirigir la raíz al login (link principal)
app.get('/', (req, res) => {
  res.redirect('/login/login.html');
});

// ❌ Bloquear acceso directo a .html solo si NO hay sesión
app.use((req, res, next) => {
  if (
    req.path.endsWith(".html") && 
    !req.path.startsWith("/login/") && 
    !(req.session && req.session.usuario) // ✅ permitir si ya hay sesión
  ) {
    return res.redirect("/login/login.html");
  }
  next();
});


//Proteger carpeta frontend completa
app.use('/frontend', verificarSesion, express.static(path.join(__dirname, 'frontend')));

//Rutas directas protegidas (sin .html en la URL)
app.get('/expedientes', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'expedientes.html'));
});

app.get('/medico', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'medico.html'));
});

app.get('/recibos', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'recibo.html'));
});

app.get('/ordenes', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'ordenes.html'));
});

app.get('/optometria', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'optometria.html'));
});

app.get('/insumos', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'insumos.html'));
});

app.get('/cierrecaja', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'cierre-caja.html'));
});

app.get('/agendaquirurgica', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'A_Quirurgica.html'));
});

app.get('/amodulos', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'A_modulos.html'));
});
app.get('/reportes', verificarSesion, (req, res) => { 
  res.sendFile(path.join(__dirname, 'frontend', 'reportes.html'));
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

        //Guardar datos en sesión
        req.session.usuario = {
            nomina: usuario.nomina,
            username: usuario.username,
            rol: usuario.rol,
            departamento: usuario.rol === "admin" ? "ADMIN" : usuario.departamento
        };
          
        res.json({ 
            mensaje: 'Login exitoso', 
            usuario: req.session.usuario,
            rol: usuario.rol
        });

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
            token // Solo para pruebas
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
    // Buscar usuario válido con token
    const user = await pool.query(
      'SELECT * FROM usuarios WHERE nomina = $1 AND reset_token = $2 AND reset_token_expire > NOW()',
      [nomina, token]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña y limpiar token
    await pool.query(
      'UPDATE usuarios SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE nomina = $2',
      [hashedPassword, nomina]
    );

    // Registrar notificación en la BD
    const username = user.rows[0].username;
    await pool.query(
      "INSERT INTO notificaciones (mensaje, usuario) VALUES ($1, $2)",
      [`🔑 El usuario ${username} cambió su contraseña`, username]
    );

    res.json({ mensaje: 'Contraseña restablecida con éxito' });
  } catch (err) {
    console.error("❌ Error en /api/reset-password:", err);
    res.status(500).json({ error: 'Error restableciendo contraseña' });
  }
});

// ==================== ELIMINAR USUARIO (SOLO ADMIN) ====================
app.delete('/api/admin/delete-user/:nomina', isAdmin, async (req, res) => {
  try {
    const { nomina } = req.params;

    const result = await pool.query(
      'DELETE FROM usuarios WHERE nomina = $1 RETURNING *',
      [nomina]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Registrar notificación en la BD
    const eliminado = result.rows[0].username;
    await pool.query(
      "INSERT INTO notificaciones (mensaje, usuario) VALUES ($1, $2)",
      [`🗑️ El usuario ${eliminado} fue eliminado por un administrador`, 'admin']
    );

    res.json({ mensaje: '🗑️ Usuario eliminado correctamente' });
  } catch (err) {
    console.error("❌ Error en /api/admin/delete-user:", err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});




// ==================== HELPER: Determinar sucursal activa ====================
function getDepartamento(req) {
  if (req.session.usuario.rol === "admin") {
    //Si el admin no seleccionó sucursal, usamos "ADMIN" como valor especial
    return req.session.usuario.sucursalSeleccionada || "ADMIN";
  }
  return req.session.usuario.departamento;
}


// ==================== MODULO DE EXPEDIENTES ====================

// 1. CREAR NUEVO EXPEDIENTE
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
    // Buscar último número usado en esta sucursal
    const lastFolio = await pool.query(
      "SELECT COALESCE(MAX(numero_expediente), 0) + 1 AS next_id FROM expedientes WHERE departamento = $1",
      [depto]
    );
    const nextId = lastFolio.rows[0].next_id;

    //Insertar con folio único dentro de la sucursal
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

// 2. OBTENER TODOS LOS EXPEDIENTES
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

// 3. BUSCAR EXPEDIENTES (DEBE ESTAR ANTES DE /:id)
app.get('/api/expedientes/buscar', verificarSesion, async (req, res) => {
  try {
    const { q } = req.query;
    const depto = getDepartamento(req);

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: "Parámetro de búsqueda vacío" });
    }

    const busqueda = q.trim();
    const esNumero = !isNaN(busqueda);

    let query, params;

    if (esNumero) {
      query = `
        SELECT * FROM expedientes 
        WHERE numero_expediente = $1 AND departamento = $2
        ORDER BY numero_expediente ASC
      `;
      params = [parseInt(busqueda), depto];
    } else {
      query = `
        SELECT * FROM expedientes 
        WHERE LOWER(nombre_completo) LIKE LOWER($1) AND departamento = $2
        ORDER BY nombre_completo ASC
      `;
      params = [`%${busqueda}%`, depto];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error("Error en búsqueda de expedientes:", err);
    res.status(500).json({ error: "Error al buscar expedientes" });
  }
});

// 4. LISTA DE PACIENTES (TAMBIÉN ANTES DE /:id)
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

// 5. OBTENER UN EXPEDIENTE POR NÚMERO (DESPUÉS DE RUTAS ESPECÍFICAS)
app.get('/api/expedientes/:numero', verificarSesion, async (req, res) => {
  console.log("📍 GET /api/expedientes/:numero");
  
  const numero = parseInt(req.params.numero, 10);
  const departamentoQuery = req.query.departamento; // ← Recibir depto desde query params
  
  if (isNaN(numero)) {
    console.log("❌ Número inválido:", req.params.numero);
    return res.status(400).json({ error: "Número de expediente inválido" });
  }

  let depto = getDepartamento(req); // Sucursal del usuario actual
  
  // Si viene departamento en la query y el usuario es admin, usarlo
  if (departamentoQuery && req.session.usuario.rol === "admin") {
    depto = departamentoQuery;
  }

  console.log("🏢 Buscando expediente", numero, "en departamento:", depto);

  try {
    const result = await pool.query(
      "SELECT * FROM expedientes WHERE numero_expediente = $1 AND departamento = $2",
      [numero, depto]
    );

    console.log("📊 Resultados encontrados:", result.rows.length);

    if (result.rows.length === 0) {
      console.log("❌ No se encontró expediente:", numero, "en departamento:", depto);
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    console.log("✅ Expediente encontrado:", result.rows[0].nombre_completo);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error al obtener expediente:", err);
    res.status(500).json({ error: "Error al obtener expediente" });
  }
});

// 6. ACTUALIZAR EXPEDIENTE
app.put('/api/expedientes/:numero', verificarSesion, async (req, res) => {
  console.log("📍 PUT /api/expedientes/:numero");
  
  const numero = parseInt(req.params.numero, 10);
  
  if (isNaN(numero)) {
    return res.status(400).json({ error: "Número de expediente inválido" });
  }

  const {
    nombre_completo,
    fecha_nacimiento,
    edad,
    padecimientos,
    colonia,
    ciudad,
    telefono1,
    telefono2,
    departamento // ← Recibir departamento desde el body
  } = req.body;

  let depto = getDepartamento(req); // Sucursal del usuario actual
  
  // Si viene departamento en el body y el usuario es admin, usarlo
  if (departamento && req.session.usuario.rol === "admin") {
    depto = departamento;
  }

  console.log("🏢 Actualizando expediente", numero, "en departamento:", depto);
  console.log("📦 Datos:", { nombre_completo, edad, padecimientos });

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
      [nombre_completo, fecha_nacimiento, edad, padecimientos, colonia, ciudad, telefono1, telefono2, numero, depto]
    );

    console.log("📊 Filas actualizadas:", result.rows.length);

    if (result.rows.length === 0) {
      console.log("❌ No se encontró expediente para actualizar");
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    console.log("✅ Expediente actualizado correctamente:", result.rows[0].nombre_completo);
    res.json({ mensaje: "Expediente actualizado correctamente", expediente: result.rows[0] });
  } catch (err) {
    console.error("❌ Error al actualizar expediente:", err);
    res.status(500).json({ error: "Error al actualizar expediente" });
  }
});

// 7. ELIMINAR EXPEDIENTE (SOLO ADMIN)
app.delete('/api/expedientes/:numero', verificarSesion, isAdmin, async (req, res) => {
  console.log("📍 DELETE /api/expedientes/:numero");
  
  const numero = parseInt(req.params.numero, 10);
  
  if (isNaN(numero)) {
    return res.status(400).json({ error: "Número de expediente inválido" });
  }

  const depto = getDepartamento(req);
  console.log("🏢 Eliminando expediente", numero, "en departamento:", depto);

  try {
    const result = await pool.query(
      "DELETE FROM expedientes WHERE numero_expediente = $1 AND departamento = $2 RETURNING *",
      [numero, depto]
    );

    if (result.rows.length === 0) {
      console.log("❌ No se encontró expediente para eliminar");
      return res.status(404).json({ error: "Expediente no encontrado o no pertenece a tu sucursal" });
    }

    console.log("✅ Expediente eliminado:", result.rows[0].nombre_completo);
    res.json({ mensaje: "🗑️ Expediente eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar expediente:", err);
    res.status(500).json({ error: "Error al eliminar expediente" });
  }
});


// ==================== MODULO DE RECIBOS ====================
// ==================== Guardar recibo ====================
app.post('/api/recibos', verificarSesion, async (req, res) => {
  const { fecha, paciente_id, procedimiento, precio, forma_pago, monto_pagado, tipo } = req.body;
  const depto = getDepartamento(req);

  try {
    // Verificar que el paciente exista en el departamento
    const expediente = await pool.query(
      "SELECT numero_expediente FROM expedientes WHERE numero_expediente = $1 AND departamento = $2",
      [paciente_id, depto]
    );

    if (expediente.rows.length === 0) {
      return res.status(400).json({ error: "El paciente no existe en este departamento" });
    }

    const folio = expediente.rows[0].numero_expediente;

    // Insertar recibo
    const result = await pool.query(
      `INSERT INTO recibos 
         (fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado, tipo, departamento)
       VALUES 
         ($1::date, $2, $3, $4, $5::numeric, $6, $7::numeric, $8, $9)
       RETURNING *`,
      [fecha, folio, paciente_id, procedimiento, precio, forma_pago, monto_pagado, tipo, depto]
    );

    const recibo = result.rows[0];

    // Si es una orden de cirugía, crear orden médica y agenda
    if (tipo === "OrdenCirugia") {
      // 📅 Obtener fecha local exacta sin desfase (México)
      const fechaLocal = fechaLocalMX();

      // Crear orden médica y reflejar el pago
      const orden = await pool.query(
        `INSERT INTO ordenes_medicas (
           expediente_id, folio_recibo, procedimiento, tipo, precio, pagado, pendiente, estatus, fecha, fecha_cirugia, departamento, medico
         )
         VALUES (
           $1, $2, $3, $4, $5::numeric, $6::numeric, ($5::numeric - $6::numeric),
           CASE WHEN $6::numeric >= $5::numeric THEN 'Pagado' ELSE 'Pendiente' END,
           $7::date, NULL, $8, 'Pendiente'
         )
         RETURNING id`,
        [paciente_id, recibo.id, procedimiento, tipo, precio, monto_pagado, fechaLocal, depto]
      );

      const ordenId = orden.rows[0].id;

      // Registrar pago inicial
      await pool.query(
        `INSERT INTO pagos (orden_id, monto, forma_pago, fecha, departamento)
         VALUES ($1, $2::numeric, $3, $4::date, $5)`,
        [ordenId, monto_pagado, forma_pago, fechaLocal, depto]
      );

      // Insertar en agenda quirúrgica (sin nombre_paciente)
      await pool.query(
        `INSERT INTO agenda_quirurgica (paciente_id, procedimiento, fecha, departamento, recibo_id, orden_id)
         VALUES ($1, $2, $3::date, $4, $5, $6)`,
        [paciente_id, procedimiento, fechaLocal, depto, recibo.id, ordenId]
      );
    }

    res.json({ mensaje: "✅ Recibo guardado correctamente", recibo });
  } catch (err) {
    console.error("Error al guardar recibo:", err);
    res.status(500).json({ error: "Error al guardar recibo", detalle: err.message });
  }
});





// ==================== Listar recibos ====================
app.get('/api/recibos', verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);
    const { fecha, desde, hasta } = req.query; // 👈 soporta fecha y rango

    let query = `
      SELECT 
        r.id,
        r.fecha,
        r.folio,
        e.nombre_completo AS paciente,
        r.procedimiento,
        r.tipo,
        r.forma_pago,
        r.monto_pagado,
        r.precio,
        (r.precio - r.monto_pagado) AS pendiente
      FROM recibos r
      LEFT JOIN expedientes e 
        ON r.paciente_id = e.numero_expediente 
       AND r.departamento = e.departamento
      WHERE r.departamento = $1
    `;
    let params = [depto];

    if (fecha) {
      query += " AND r.fecha = $2";
      params.push(fecha);
    } else if (desde && hasta) {
      query += " AND r.fecha BETWEEN $2 AND $3";
      params.push(desde, hasta);
    } else {
      query += " AND r.fecha = CURRENT_DATE"; // 👈 por defecto carga solo los de hoy
    }

    query += " ORDER BY r.fecha DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener recibos:", err);
    res.status(500).json({ error: "Error al obtener recibos" });
  }
});




// Eliminar recibo (con pagos y órdenes asociadas)
app.delete('/api/recibos/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);

    // 1. Eliminar pagos asociados a órdenes de este recibo
    await pool.query(
      `DELETE FROM pagos 
       WHERE orden_id IN (
         SELECT id FROM ordenes_medicas 
         WHERE folio_recibo = $1 AND departamento = $2
       ) AND departamento = $2`,
      [id, depto]
    );

    // 2. Eliminar órdenes médicas asociadas al recibo
    await pool.query(
      `DELETE FROM ordenes_medicas 
       WHERE folio_recibo = $1 AND departamento = $2`,
      [id, depto]
    );

    // 3. Eliminar el recibo
    const result = await pool.query(
      'DELETE FROM recibos WHERE id = $1 AND departamento = $2 RETURNING *',
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recibo no encontrado o no pertenece a este departamento" });
    }

    res.json({ mensaje: "🗑️ Recibo y registros asociados eliminados correctamente" });
  } catch (err) {
    console.error("Error eliminando recibo:", err);
    res.status(500).json({ error: "Error eliminando recibo" });
  }
});

// ==================== Obtener un recibo por ID ====================
app.get('/api/recibos/:id', verificarSesion, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);

    const result = await pool.query(`
      SELECT r.id, r.fecha, r.folio, e.nombre_completo AS paciente,
             r.procedimiento, r.tipo, r.forma_pago, r.monto_pagado, r.precio,
             (r.precio - r.monto_pagado) AS pendiente
      FROM recibos r
      JOIN expedientes e 
        ON r.paciente_id = e.numero_expediente 
       AND r.departamento = e.departamento
      WHERE r.id = $1 AND r.departamento = $2
      LIMIT 1
    `, [id, depto]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Recibo no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al obtener recibo:", err);
    res.status(500).json({ error: "Error al obtener recibo" });
  }
});

// ==================== Abonar a un recibo ====================
app.post('/api/recibos/:id/abonos', verificarSesion, async (req, res) => {
  const { id } = req.params;
  const { monto, forma_pago } = req.body;
  const depto = getDepartamento(req);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Insertar el abono en abonos_recibos
    await client.query(
      `INSERT INTO abonos_recibos (recibo_id, monto, forma_pago, fecha, departamento)
 VALUES ($1, $2, $3, $4, $5)`,
[id, monto, forma_pago, fechaLocalMX(), depto]

    );

    // 2️⃣ Actualizar monto_pagado en el recibo
    const result = await client.query(
      `UPDATE recibos
       SET monto_pagado = monto_pagado + $1
       WHERE id = $2 AND departamento = $3
       RETURNING *`,
      [monto, id, depto]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Recibo no encontrado" });
    }

    const recibo = result.rows[0];

    // 3️⃣ Si el recibo es de tipo OrdenCirugia → actualizar orden y registrar pago
    if (recibo.tipo && recibo.tipo.toLowerCase().includes("orden")) {
      const ordenResult = await client.query(
        `SELECT id, expediente_id, precio, pagado, pendiente
         FROM ordenes_medicas
         WHERE folio_recibo = $1 AND departamento = $2`,
        [id, depto]
      );

      if (ordenResult.rows.length > 0) {
        const orden = ordenResult.rows[0];

        const nuevoPagado = Number(orden.pagado || 0) + Number(monto);
        const nuevoPendiente = Math.max(0, Number(orden.precio) - nuevoPagado);
        const nuevoEstatus = nuevoPendiente <= 0 ? "Pagado" : "Pendiente";

        // Actualiza totales de la orden médica
        await client.query(
          `UPDATE ordenes_medicas
           SET pagado = $1, pendiente = $2, estatus = $3
           WHERE id = $4 AND departamento = $5`,
          [nuevoPagado, nuevoPendiente, nuevoEstatus, orden.id, depto]
        );

        // Registrar el pago también en la tabla pagos (para el historial y cierre de caja)
        await client.query(
          `INSERT INTO pagos (orden_id, expediente_id, monto, forma_pago, fecha, departamento)
 VALUES ($1, $2, $3, $4, $5, $6)`,
[orden.id, orden.expediente_id, monto, forma_pago, fechaLocalMX(), depto]

        );
      }
    }

    await client.query("COMMIT");
    res.json({ mensaje: "✅ Abono registrado correctamente" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al registrar abono:", err.message);
    res.status(500).json({
      error: "Error al registrar abono",
      detalle: err.message
    });
  } finally {
    client.release();
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
// ----------------BUSCAR PACIENTE POR FOLIO ----------------
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
  // Determinar sucursal activa
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
      procedimiento_id, //viene como id desde el frontend
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

    // Buscar el recibo
    const reciboResult = await pool.query(
      `SELECT id, paciente_id, tipo 
       FROM recibos 
       WHERE id = $1 AND departamento = $2`,
      [folio_recibo, depto]
    );

    if (reciboResult.rows.length === 0) {
      return res.status(404).json({ error: "No se encontró el recibo en esta sucursal" });
    }
    const recibo = reciboResult.rows[0];

    // Buscar nombre y precio del procedimiento en el catálogo
    const procResult = await pool.query(
      `SELECT nombre, precio FROM catalogo_procedimientos WHERE id = $1`,
      [procedimiento_id]
    );

    if (procResult.rows.length === 0) {
      return res.status(404).json({ error: "No se encontró el procedimiento en el catálogo" });
    }
    const { nombre: procedimientoNombre, precio: procedimientoPrecio } = procResult.rows[0];

    // 📅 Fecha local sin desfase
    const fechaLocal = fechaLocalMX();

    // Guardar la orden con precio incluido
    const result = await pool.query(
      `INSERT INTO ordenes_medicas (
        expediente_id, folio_recibo, medico, diagnostico, lado, procedimiento, tipo, precio,
        anexos, conjuntiva, cornea, camara_anterior, cristalino,
        retina, macula, nervio_optico, ciclopejia, hora_tp,
        problemas, plan, estatus, fecha, departamento
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,
        $19,$20,'Pendiente',$21::date,$22
      )
      RETURNING *`,
      [
        recibo.paciente_id,
        recibo.id,
        medico, diagnostico, lado,
        procedimientoNombre,
        recibo.tipo,
        procedimientoPrecio,
        anexos, conjuntiva, cornea, camara_anterior, cristalino,
        retina, macula, nervio_optico, ciclopejia, hora_tp,
        problemas, plan,
        fechaLocal,  // 👈 ya sin desfase
        depto
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
        ON e.numero_expediente = o.expediente_id   
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
// ==================== LISTAR TODAS LAS ÓRDENES (con filtro por rango opcional) ====================
app.get("/api/ordenes_medicas", verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);
    const { desde, hasta } = req.query; // 👈 soporte para filtro de rango

    let params = [depto];
    let where = "o.departamento = $1";

    if (desde && hasta) {
      params.push(desde, hasta);
      where += ` AND DATE(o.fecha) BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    const query = `
      SELECT 
        o.id AS orden_id,                          
        e.numero_expediente AS expediente_numero, 
        e.nombre_completo AS paciente, 
        o.medico, 
        o.diagnostico, 
        o.lado, 
        o.procedimiento, 
        o.tipo,
        o.precio,                                  
        COALESCE(SUM(p.monto), 0) AS pagado,      
        (o.precio - COALESCE(SUM(p.monto), 0)) AS pendiente,
        o.estatus,
        o.fecha
      FROM ordenes_medicas o
      JOIN expedientes e 
        ON e.numero_expediente = o.expediente_id
       AND e.departamento = o.departamento
      LEFT JOIN pagos p 
        ON p.orden_id = o.id 
       AND p.departamento = o.departamento
      WHERE ${where}
      GROUP BY o.id, e.numero_expediente, e.nombre_completo, 
               o.medico, o.diagnostico, o.lado, o.procedimiento, 
               o.tipo, o.precio, o.estatus, o.fecha
      ORDER BY o.fecha DESC;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/ordenes_medicas:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ACTUALIZAR CAMPO DE ORDEN MÉDICA ====================
app.put("/api/ordenes_medicas/:id", verificarSesion, async (req, res) => {
  try {
    const { id } = req.params;
    const { medico, diagnostico, lado } = req.body;
    const depto = getDepartamento(req);

    if (!depto)
      return res.status(401).json({ error: "Sesión expirada o sin departamento" });

    // Verificar que se envió al menos un campo
    const campos = [];
    const valores = [];
    let idx = 1;

    if (medico !== undefined) {
      campos.push(`medico = $${idx++}`);
      valores.push(medico.trim());
    }
    if (diagnostico !== undefined) {
      campos.push(`diagnostico = $${idx++}`);
      valores.push(diagnostico.trim());
    }
    if (lado !== undefined) {
      campos.push(`lado = $${idx++}`);
      valores.push(lado.trim());
    }

    if (campos.length === 0)
      return res.status(400).json({ error: "No se enviaron campos válidos" });

    // Comprobar existencia de la orden
    const check = await pool.query(
      "SELECT id FROM ordenes_medicas WHERE id = $1 AND departamento = $2",
      [id, depto]
    );
    if (check.rowCount === 0)
      return res.status(404).json({ error: "Orden no encontrada o sin acceso" });

    // Query dinámica segura
    const query = `
      UPDATE ordenes_medicas
      SET ${campos.join(", ")}
      WHERE id = $${idx} AND departamento = $${idx + 1}
      RETURNING *;
    `;
    valores.push(id, depto);

    const result = await pool.query(query, valores);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Orden no encontrada después del update" });

    res.json({
      mensaje: "✅ Campo actualizado correctamente",
      orden: result.rows[0],
    });
  } catch (err) {
    console.error("Error en PUT /api/ordenes_medicas/:id:", err.message);
    res.status(500).json({
      error: err.message || "Error al actualizar la orden médica",
    });
  }
});




// ==================== PAGOS ====================
// Registrar un pago para una orden (usando orden_id del frontend)
app.post("/api/pagos", verificarSesion, async (req, res) => {
  const client = await pool.connect();
  const depto = getDepartamento(req);

  try {
    let { orden_id, monto, forma_pago } = req.body;
    orden_id = parseInt(orden_id, 10);
    monto = parseFloat(monto);

    if (isNaN(orden_id) || isNaN(monto) || monto <= 0) {
      return res.status(400).json({ error: "Datos de pago inválidos" });
    }

    await client.query("BEGIN");

    // 1️⃣ Obtener la orden médica
    const ordenResult = await client.query(
      `SELECT id, expediente_id, tipo, precio, pagado, pendiente, folio_recibo
       FROM ordenes_medicas
       WHERE id = $1 AND departamento = $2`,
      [orden_id, depto]
    );

    if (ordenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const orden = ordenResult.rows[0];

    // 2️⃣ Registrar el pago
    const pagoResult = await client.query(
  `INSERT INTO pagos (orden_id, expediente_id, monto, forma_pago, fecha, departamento)
   VALUES ($1, $2, $3, $4, $5, $6)
   RETURNING *`,
  [orden.id, orden.expediente_id, monto, forma_pago, fechaLocalMX(), depto]
);


    // 3️⃣ Calcular nuevos totales de la orden
    const nuevoPagado = Number(orden.pagado || 0) + monto;
    const nuevoPendiente = Math.max(0, Number(orden.precio || 0) - nuevoPagado);
    const nuevoEstatus = nuevoPendiente <= 0 ? "Pagado" : "Pendiente";

    // 4️⃣ Actualizar orden médica
    await client.query(
      `UPDATE ordenes_medicas
       SET pagado = $1, pendiente = $2, estatus = $3
       WHERE id = $4 AND departamento = $5`,
      [nuevoPagado, nuevoPendiente, nuevoEstatus, orden.id, depto]
    );

    // 5️⃣ Sincronizar solo si es tipo "OrdenCirugia"
    if (orden.tipo === "OrdenCirugia") {
      await client.query(
        `UPDATE recibos
         SET monto_pagado = monto_pagado + $1
         WHERE id = $2 AND departamento = $3`,
        [monto, orden.folio_recibo, depto]
      );
    }

    await client.query("COMMIT");

    res.json({
      mensaje: "✅ Pago registrado correctamente",
      pago: pagoResult.rows[0],
      totalPagado: nuevoPagado,
      pendiente: nuevoPendiente
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error en /api/pagos:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================== MODULO DE CIERRE DE CAJA ====================
app.get("/api/cierre-caja", verificarSesion, async (req, res) => {
  try {
    const { fecha, desde, hasta } = req.query;
    const depto = getDepartamento(req);
    const params = [depto];
    
    // Filtros de fecha
    let whereRecibos = "r.departamento = $1";
    let wherePagos = "p.departamento = $1";

    if (fecha) {
      params.push(fecha);
      whereRecibos += ` AND DATE(r.fecha) = $${params.length}`;
      wherePagos += ` AND DATE(p.fecha) = $${params.length}`;
    } else if (desde && hasta) {
      params.push(desde, hasta);
      whereRecibos += ` AND DATE(r.fecha) BETWEEN $${params.length - 1} AND $${params.length}`;
      wherePagos += ` AND DATE(p.fecha) BETWEEN $${params.length - 1} AND $${params.length}`;
    } else {
      whereRecibos += " AND DATE(r.fecha) = CURRENT_DATE";
      wherePagos += " AND DATE(p.fecha) = CURRENT_DATE";
    }

    const query = `
      WITH resumen AS (
        -- Recibos tipo "Normal" (consulta inicial, se suma completo)
        SELECT 
          r.forma_pago AS pago,
          r.procedimiento AS procedimiento,
          SUM(r.monto_pagado) AS total
        FROM recibos r
        WHERE ${whereRecibos}
          AND (r.tipo = 'Normal' OR r.tipo IS NULL OR r.tipo = '')
        GROUP BY r.forma_pago, r.procedimiento

        UNION ALL

        -- Recibos tipo "OrdenCirugia" que NO tienen orden médica aún (evitar duplicados)
        SELECT 
          r.forma_pago AS pago,
          r.procedimiento AS procedimiento,
          SUM(r.monto_pagado) AS total
        FROM recibos r
        WHERE ${whereRecibos}
          AND r.tipo = 'OrdenCirugia'
          AND NOT EXISTS (
            SELECT 1 FROM ordenes_medicas o 
            WHERE o.folio_recibo = r.id AND o.departamento = r.departamento
          )
        GROUP BY r.forma_pago, r.procedimiento

        UNION ALL

        -- Pagos de órdenes médicas (cirugías programadas desde módulo médico)
        SELECT 
          p.forma_pago AS pago,
          o.procedimiento AS procedimiento,
          SUM(p.monto) AS total
        FROM pagos p
        JOIN ordenes_medicas o ON o.id = p.orden_id AND o.departamento = p.departamento
        WHERE ${wherePagos}
        GROUP BY p.forma_pago, o.procedimiento
      )
      SELECT pago, procedimiento, SUM(total) AS total
      FROM resumen
      GROUP BY pago, procedimiento
      ORDER BY pago, procedimiento;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/cierre-caja:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== LISTADO DE PACIENTES (SALDO INDIVIDUAL CORRECTO) ====================
app.get("/api/listado-pacientes", verificarSesion, async (req, res) => {
  try {
    const { fecha, desde, hasta } = req.query;
    const depto = getDepartamento(req);
    const params = [depto];

    // --- Filtros dinámicos ---
    let whereRecibos = "r.departamento = $1";
    let wherePagos = "p.departamento = $1";

    if (fecha) {
      params.push(fecha);
      whereRecibos += ` AND DATE(r.fecha) = $${params.length}`;
      wherePagos += ` AND DATE(p.fecha) = $${params.length}`;
    } else if (desde && hasta) {
      params.push(desde, hasta);
      whereRecibos += ` AND DATE(r.fecha) BETWEEN $${params.length - 1} AND $${params.length}`;
      wherePagos += ` AND DATE(p.fecha) BETWEEN $${params.length - 1} AND $${params.length}`;
    } else {
      whereRecibos += " AND DATE(r.fecha) = CURRENT_DATE";
      wherePagos += " AND DATE(p.fecha) = CURRENT_DATE";
    }

    // --- Consulta SQL FINAL CORREGIDA ---
    const query = `
      WITH datos_completos AS (
        -- 1️⃣ Recibos tipo NORMAL
        SELECT 
          r.paciente_id AS numero_expediente,
          r.fecha,
          r.procedimiento,
          CASE 
            WHEN (r.precio - r.monto_pagado) > 0 THEN 'Pendiente'
            ELSE 'Pagado'
          END AS status,
          r.forma_pago AS pago,
          r.precio AS precio_total,
          COALESCE(r.monto_pagado, 0)::numeric AS pagado,
          (r.precio - r.monto_pagado)::numeric AS pendiente
        FROM recibos r
        WHERE ${whereRecibos}
          AND (r.tipo = 'Normal' OR r.tipo IS NULL OR r.tipo = '')

        UNION ALL

        -- 2️⃣ Recibos tipo "OrdenCirugia" sin orden médica
        SELECT 
          r.paciente_id AS numero_expediente,
          r.fecha,
          r.procedimiento,
          CASE 
            WHEN (r.precio - r.monto_pagado) > 0 THEN 'Pendiente'
            ELSE 'Pagado'
          END AS status,
          r.forma_pago AS pago,
          r.precio AS precio_total,
          COALESCE(r.monto_pagado, 0)::numeric AS pagado,
          (r.precio - r.monto_pagado)::numeric AS pendiente
        FROM recibos r
        WHERE ${whereRecibos}
          AND r.tipo = 'OrdenCirugia'
          AND NOT EXISTS (
            SELECT 1 FROM ordenes_medicas o 
            WHERE o.folio_recibo = r.id 
              AND o.departamento = r.departamento
          )

        UNION ALL

        -- 3️⃣ Órdenes médicas con pagos
        SELECT 
          o.expediente_id AS numero_expediente,
          COALESCE(o.fecha_cirugia, o.fecha) AS fecha,
          o.procedimiento,
          o.estatus AS status,
          STRING_AGG(DISTINCT p.forma_pago, ', ') AS pago,
          o.precio AS precio_total,
          COALESCE(o.pagado, 0)::numeric AS pagado,
          COALESCE(o.pendiente, 0)::numeric AS pendiente
        FROM ordenes_medicas o
        LEFT JOIN pagos p 
          ON p.orden_id = o.id 
         AND p.departamento = o.departamento
        WHERE o.departamento = $1
          AND (
            (${params.length === 1 ? 'DATE(o.fecha) = CURRENT_DATE' : 
               params.length === 2 ? `DATE(o.fecha) = $2` : 
               `DATE(o.fecha) BETWEEN $2 AND $3`})
            OR 
            (${params.length === 1 ? 'DATE(p.fecha) = CURRENT_DATE' : 
               params.length === 2 ? `DATE(p.fecha) = $2` : 
               `DATE(p.fecha) BETWEEN $2 AND $3`})
          )
        GROUP BY o.id, o.expediente_id, o.fecha, o.fecha_cirugia, 
                 o.procedimiento, o.estatus, o.precio, o.pagado, o.pendiente
      )

      SELECT 
        e.numero_expediente AS folio,
        e.nombre_completo AS nombre,
        TO_CHAR(d.fecha, 'YYYY-MM-DD') AS fecha,
        d.procedimiento,
        d.status,
        d.pago,
        d.pagado AS total,
        -d.pendiente AS saldo  -- ✅ Negativo cuando debe dinero
      FROM datos_completos d
      JOIN expedientes e 
        ON e.numero_expediente = d.numero_expediente 
       AND e.departamento = $1
      ORDER BY d.fecha DESC, e.nombre_completo;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error("❌ Error en /api/listado-pacientes:", err);
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


// ==================== MODULO DE OPTOMETRÍA ====================
// ==================== MODULO DE OPTOMETRÍA ====================
// Guardar nueva evaluación de optometría
app.post("/api/optometria", verificarSesion, async (req, res) => {
  try {
    const {
      expediente_id,
      esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
      esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
      bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi,
      cicloplejia, hora_tp,
      av_lejos_od1, av_lejos_od2, av_lejos_od3,
      av_cerca_od1, av_cerca_od2,
      av_lentes_od1, av_lentes_od2,
      av_lejos_oi1, av_lejos_oi2, av_lejos_oi3,
      av_cerca_oi1, av_cerca_oi2,
      av_lentes_oi1, av_lentes_oi2
    } = req.body;

    let depto = getDepartamento(req);

    // ✅ Usa la función fechaLocalMX() que ya tienes definida al inicio
    const fechaMX = fechaLocalMX();

    const result = await pool.query(
      `INSERT INTO optometria (
        expediente_id, esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
        esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
        bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi,
        cicloplejia, hora_tp,
        av_lejos_od1, av_lejos_od2, av_lejos_od3,
        av_cerca_od1, av_cerca_od2,
        av_lentes_od1, av_lentes_od2,
        av_lejos_oi1, av_lejos_oi2, av_lejos_oi3,
        av_cerca_oi1, av_cerca_oi2,
        av_lentes_oi1, av_lentes_oi2,
        fecha, departamento
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,
        $20,$21,
        $22,$23,$24,
        $25,$26,
        $27,$28,
        $29,$30,$31,
        $32,$33,
        $34,$35,
        $36,$37
      )
      RETURNING *`,
      [
        expediente_id,
        esfera_od, cilindro_od, eje_od, avcc_od, adicion_od, avcc2_od,
        esfera_oi, cilindro_oi, eje_oi, avcc_oi, adicion_oi, avcc2_oi,
        bmp, bmp_od, bmp_oi, fo, fo_od, fo_oi,
        cicloplejia, hora_tp,
        av_lejos_od1, av_lejos_od2, av_lejos_od3,
        av_cerca_od1, av_cerca_od2,
        av_lentes_od1, av_lentes_od2,
        av_lejos_oi1, av_lejos_oi2, av_lejos_oi3,
        av_cerca_oi1, av_cerca_oi2,
        av_lentes_oi1, av_lentes_oi2,
        fechaMX,  // 👈 Fecha real de México
        depto
      ]
    );

    res.json({ mensaje: "✅ Optometría guardada con éxito", data: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar optometría:", err);
    res.status(500).json({ error: err.message });
  }
});


// Obtener evaluaciones de optometría (con nombre de paciente) con filtros
app.get("/api/optometria", verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);
    const { filtro, desde, hasta } = req.query;

    let query = `
      SELECT o.*, e.nombre_completo AS nombre
      FROM optometria o
      JOIN expedientes e 
        ON o.expediente_id = e.numero_expediente 
       AND o.departamento = e.departamento
      WHERE o.departamento = $1
    `;

    let params = [depto];

    if (desde && hasta) {
      query += " AND DATE(o.fecha) BETWEEN $2::date AND $3::date";
      params.push(desde, hasta);
    } else if (filtro === "hoy") {
      query += " AND DATE(o.fecha) = CURRENT_DATE";
    } else if (filtro === "ayer") {
      query += " AND DATE(o.fecha) = CURRENT_DATE - INTERVAL '1 day'";
    } else if (filtro === "mes") {
      query += " AND DATE_TRUNC('month', o.fecha) = DATE_TRUNC('month', CURRENT_DATE)";
    }

    query += " ORDER BY o.fecha DESC";

    const result = await pool.query(query, params);
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


// Obtener nombre del paciente por número de expediente
app.get("/api/expedientes/:id/nombre", verificarSesion, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);

    const result = await pool.query(
      `SELECT nombre_completo 
         FROM expedientes 
        WHERE numero_expediente = $1 
          AND departamento = $2`,
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    res.json({ nombre: result.rows[0].nombre_completo });
  } catch (err) {
    console.error("Error en /api/expedientes/:id/nombre:", err);
    res.status(500).json({ error: "Error al obtener nombre del paciente" });
  }
});




// ==================== MODULO DE INSUMOS ====================
// Configuración de multer para guardar con nombre único
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads")); // carpeta uploads
  },
  filename: function (req, file, cb) {
    // agrega timestamp al nombre para evitar duplicados
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Servir los archivos subidos para poder descargarlos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==================== 1. Guardar insumo manual ====================
app.post("/api/insumos", verificarSesion, async (req, res) => {
  try {
    const { fecha, folio, concepto, monto } = req.body;
    let depto = getDepartamento(req);

    if (!depto) {
      console.warn("⚠️ Departamento no detectado en sesión");
      return res
        .status(401)
        .json({ error: "No se pudo identificar el departamento del usuario" });
    }

    const result = await pool.query(
      `INSERT INTO insumos (fecha, folio, concepto, monto, departamento) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fecha, folio, concepto, monto, depto]
    );

    res.json({ mensaje: "✅ Insumo agregado", insumo: result.rows[0] });
  } catch (err) {
    console.error("Error al guardar insumo:", err);
    res.status(500).json({ error: "Error al guardar insumo" });
  }
});

// ==================== 2. Listar insumos ====================
app.get("/api/insumos", verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);

    if (!depto) {
      console.warn("⚠️ Departamento no detectado al listar insumos");
      return res
        .status(401)
        .json({ error: "No se pudo identificar el departamento del usuario" });
    }

    const result = await pool.query(
      "SELECT * FROM insumos WHERE departamento = $1 ORDER BY fecha ASC",
      [depto]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener insumos:", err);
    res.status(500).json({ error: "Error al obtener insumos" });
  }
});

// ==================== 3. Subir Excel (CORREGIDO MONTOS) ====================
app.post(
  "/api/insumos/upload",
  verificarSesion,
  upload.single("excelFile"),
  async (req, res) => {
    try {
      const depto = getDepartamento(req);
      if (!depto) {
        return res.status(401).json({
          error: "No se pudo identificar el departamento del usuario",
        });
      }

      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // 🔹 IMPORTANTE: raw: true mantiene los números como están en Excel
      const data = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: true });

      let insertados = 0;
      let actualizados = 0;
      let omitidos = 0;
      let errores = [];

      for (let index = 0; index < data.length; index++) {
        const row = data[index];
        const numFila = index + 2;
        
        try {
          // === FECHA ===
          let fecha = row.FECHA || row.Fecha || row.fecha || "";
          
          if (!fecha || fecha.toString().trim() === "") {
            errores.push(`Fila ${numFila}: Fecha vacía`);
            omitidos++;
            continue;
          }

          if (typeof fecha === "number") {
            const epoch = new Date(1899, 11, 30);
            const excelDate = new Date(epoch.getTime() + fecha * 86400000);
            const yyyy = excelDate.getFullYear();
            const mm = String(excelDate.getMonth() + 1).padStart(2, "0");
            const dd = String(excelDate.getDate()).padStart(2, "0");
            fecha = `${yyyy}-${mm}-${dd}`;
          } else if (typeof fecha === "string") {
            fecha = fecha.trim();
            
            if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
              // Ya está en formato correcto
            } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(fecha)) {
              fecha = fecha.replace(/\./g, "/").replace(/-/g, "/");
              const partes = fecha.split("/");
              const [dd, mm, yyyy] = partes;
              fecha = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
            } else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(fecha)) {
              fecha = fecha.replace(/\//g, "-");
              const partes = fecha.split("-");
              const [yyyy, mm, dd] = partes;
              fecha = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
            }
          }

          // === FOLIO ===
          let folio = (row.FOLIO || row.Folio || row.folio || "").toString().trim();
          
          if (!folio) {
            errores.push(`Fila ${numFila}: Folio vacío`);
            omitidos++;
            continue;
          }

          // === CONCEPTO ===
          const concepto = (row.CONCEPTO || row.Concepto || row.concepto || "").toString().trim();
          
          if (!concepto) {
            errores.push(`Fila ${numFila}: Concepto vacío`);
            omitidos++;
            continue;
          }

          // === MONTO (CORREGIDO) ===
          let montoRaw = row.MONTO || row.Monto || row.monto || "";
          let monto;

          // Si ya es un número (Excel lo leyó como número)
          if (typeof montoRaw === "number") {
            monto = montoRaw;
          } else {
            // Si es string, limpiar y convertir
            let montoTexto = montoRaw
              .toString()
              .trim()
              .replace(/\s+/g, "")       // Quitar espacios
              .replace(/[$]/g, "")        // Quitar símbolo $
              .replace(/,/g, "");         // 🔹 QUITAR TODAS LAS COMAS (separadores de miles)

            monto = parseFloat(montoTexto);
          }
          
          if (isNaN(monto) || monto <= 0) {
            errores.push(`Fila ${numFila}: Monto inválido (${montoRaw})`);
            omitidos++;
            continue;
          }

          // === VERIFICAR SI EXISTE ===
          const existe = await pool.query(
            "SELECT id FROM insumos WHERE folio = $1 AND departamento = $2",
            [folio, depto]
          );
          
          if (existe.rowCount > 0) {
            // Actualizar registro existente
            await pool.query(
              `UPDATE insumos 
               SET fecha = $1, concepto = $2, monto = $3, archivo = $4
               WHERE folio = $5 AND departamento = $6`,
              [fecha, concepto, monto, req.file.filename, folio, depto]
            );
            actualizados++;
          } else {
            // Insertar nuevo registro
            await pool.query(
              `INSERT INTO insumos (fecha, folio, concepto, monto, archivo, departamento)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [fecha, folio, concepto, monto, req.file.filename, depto]
            );
            insertados++;
          }

        } catch (rowError) {
          errores.push(`Fila ${numFila}: ${rowError.message}`);
          omitidos++;
        }
      }

      // Sincronizar secuencia
      await pool.query(
        `SELECT setval('insumos_id_seq', (SELECT COALESCE(MAX(id),0) FROM insumos) + 1)`
      );

      let mensaje = `Excel procesado: ${insertados} nuevos`;
      if (actualizados > 0) mensaje += `, ${actualizados} actualizados`;
      if (omitidos > 0) mensaje += `, ${omitidos} omitidos`;

      res.json({
        mensaje,
        insertados,
        actualizados,
        omitidos,
        errores: errores.length > 0 ? errores.slice(0, 5) : []
      });

    } catch (err) {
      res.status(500).json({ 
        error: "Error procesando Excel"
      });
    }
  }
);

// ==================== 4. Eliminar insumo ====================
app.delete("/api/insumos/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let depto = getDepartamento(req);

    if (!depto) {
      console.warn("⚠️ Departamento no detectado al eliminar insumo");
      return res
        .status(401)
        .json({ error: "No se pudo identificar el departamento del usuario" });
    }

    const result = await pool.query(
      "DELETE FROM insumos WHERE id = $1 AND departamento = $2 RETURNING *",
      [id, depto]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Insumo no encontrado o no pertenece a tu sucursal",
      });
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
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query(
            'INSERT INTO usuarios (nomina, username, password, rol, departamento) VALUES ($1,$2,$3,$4,$5)',
            [nomina, username, hashedPassword, rol, departamento]
        );

        // 🔹 Insertar los 10 módulos por defecto (permitido = false)
        const modulos = [
            'expedientes', 'recibos', 'cierredecaja', 'medico',
            'ordenes', 'optometria', 'insumos', 'usuarios',
            'agendaquirurgica', 'asignarmodulos'
        ];
        for (const m of modulos) {
            await client.query(
                'INSERT INTO permisos (usuario_nomina, modulo, permitido) VALUES ($1,$2,$3)',
                [nomina, m, false]
            );
        }

        await client.query("COMMIT");
        res.json({ mensaje: 'Usuario y permisos creados correctamente' });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: 'Error creando usuario con permisos' });
    } finally {
        client.release();
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
    //Regresa al modo admin sin sucursal activa
    delete req.session.usuario.sucursalSeleccionada;
    return res.json({ mensaje: "Regresaste al panel de Admin" });
  }

  //Guardamos la sucursal activa aparte, sin perder rol ni datos originales
  req.session.usuario.sucursalSeleccionada = departamento;
  res.json({ mensaje: `Sucursal cambiada a ${departamento}` });
});


// ==================== MODULO DE AGENDA QUIRÚRGICA ====================
// Obtener órdenes médicas
app.get("/api/ordenes", verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);
    const { desde, hasta } = req.query;

    let query = `
      SELECT 
        o.id,
        e.numero_expediente AS expediente,
        e.edad,
        e.nombre_completo AS nombre,
        o.procedimiento,
        o.precio AS total,                                        
        COALESCE(SUM(p.monto), 0) AS pagos,                      
        (o.precio - COALESCE(SUM(p.monto), 0)) AS diferencia,     
        o.estatus AS status,
        o.tipo_lente,
        r.fecha AS fecha_creacion,
        o.fecha_cirugia AS fecha_agendada,
        o.hora_cirugia
      FROM ordenes_medicas o
      JOIN recibos r 
        ON r.id = o.folio_recibo 
       AND r.departamento = o.departamento
      JOIN expedientes e 
        ON e.numero_expediente = o.expediente_id 
       AND e.departamento = o.departamento
      LEFT JOIN pagos p 
        ON p.orden_id = o.id 
       AND p.departamento = o.departamento
      WHERE o.departamento = $1
    `;

    const params = [depto];

    if (desde && hasta) {
      query += ` AND (COALESCE(o.fecha_cirugia, r.fecha)::date BETWEEN $2 AND $3)`;
      params.push(desde, hasta);
    } else {
      query += ` AND (COALESCE(o.fecha_cirugia, r.fecha)::date = CURRENT_DATE)`;
    }

    query += `
      GROUP BY o.id, e.numero_expediente, e.edad, e.nombre_completo, 
               o.procedimiento, o.precio, o.estatus, o.tipo_lente, 
               r.fecha, o.fecha_cirugia, o.hora_cirugia
      ORDER BY r.fecha DESC, o.fecha_cirugia NULLS LAST
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error("Error en /api/ordenes:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== ASIGNAR O ELIMINAR FECHA DE CIRUGÍA ====================
app.put("/api/ordenes/:id/agendar", verificarSesion, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_cirugia, hora_cirugia } = req.body;
    let depto = getDepartamento(req);

    const result = await pool.query(
      `UPDATE ordenes_medicas
       SET fecha_cirugia = $1,
           hora_cirugia = $2
       WHERE id = $3 AND departamento = $4
       RETURNING *`,
      [fecha_cirugia, hora_cirugia, id, depto]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Orden no encontrada" });

    res.json({
      mensaje: fecha_cirugia
        ? "✅ Cirugía agendada"
        : "🗑️ Cirugía eliminada",
      orden: result.rows[0]
    });
  } catch (err) {
    console.error("Error en /api/ordenes/:id/agendar:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== EDITAR TIPO DE LENTE ====================
app.put("/api/ordenes/:id/lente", verificarSesion, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_lente } = req.body;
    let depto = getDepartamento(req);

    const result = await pool.query(
      `UPDATE ordenes_medicas
       SET tipo_lente = $1
       WHERE id = $2 AND departamento = $3
       RETURNING *`,
      [tipo_lente, id, depto]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Orden no encontrada" });

    res.json({ mensaje: "✅ Tipo de lente actualizado", orden: result.rows[0] });
  } catch (err) {
    console.error("Error en /api/ordenes/:id/lente:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== LISTAR CIRUGÍAS (para calendario) ====================
app.get("/api/cirugias", verificarSesion, async (req, res) => {
  try {
    let depto = getDepartamento(req);

    const result = await pool.query(`
      SELECT 
        o.id,
        e.nombre_completo AS nombre,
        o.procedimiento,
        o.medico,
        o.tipo_lente,
        o.fecha_cirugia,
        o.hora_cirugia
      FROM ordenes_medicas o
      JOIN expedientes e 
        ON e.numero_expediente = o.expediente_id 
       AND e.departamento = o.departamento
      WHERE o.departamento = $1
        AND o.fecha_cirugia IS NOT NULL
      ORDER BY o.fecha_cirugia, o.hora_cirugia ASC
    `, [depto]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/cirugias:", err);
    res.status(500).json({ error: err.message });
  }
});





// ==================== GESTIÓN DE PERMISOS ====================
// Listar usuarios (para asignar módulos)
app.get('/api/usuarios', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT nomina, username, rol, departamento FROM usuarios ORDER BY username ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al listar usuarios:", err);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
});

// Listar permisos de un usuario (vista admin)
app.get('/api/permisos/:nomina', isAdmin, async (req, res) => {
  try {
    const { nomina } = req.params;
    const result = await pool.query(
      'SELECT modulo, permitido FROM permisos WHERE usuario_nomina = $1',
      [nomina]
    );

    const permisos = result.rows.map(p => ({
      modulo: p.modulo ? p.modulo.trim().toLowerCase().replace(/\s+/g, '') : "",
      permitido: p.permitido
    }));

    res.json(permisos);
  } catch (err) {
    console.error("Error al listar permisos:", err);
    res.status(500).json({ error: "Error al listar permisos" });
  }
});

// Guardar permisos de un usuario
app.post('/api/permisos/:nomina', isAdmin, async (req, res) => {
  try {
    const { nomina } = req.params;
    const { permisos } = req.body; // [{modulo:'expedientes', permitido:true}, ...]

    // 🔹 Limpiar permisos previos
    await pool.query('DELETE FROM permisos WHERE usuario_nomina = $1', [nomina]);

    // 🔹 Insertar los nuevos permisos
    for (let p of permisos) {
      await pool.query(
        'INSERT INTO permisos (usuario_nomina, modulo, permitido) VALUES ($1,$2,$3)',
        [nomina, p.modulo.trim().toLowerCase().replace(/\s+/g, ''), p.permitido]
      );
    }

    res.json({ mensaje: "✅ Permisos actualizados" });
  } catch (err) {
    console.error("Error al guardar permisos:", err);
    res.status(500).json({ error: "Error al guardar permisos" });
  }
});

// Obtener permisos del usuario actual (para frontend)
app.get('/api/mis-permisos', verificarSesion, async (req, res) => {
  try {
    // DEBUG
    console.log(" Sesión en /api/mis-permisos:", req.session);

    const nomina = req.session.usuario?.nomina;
    const rol = req.session.usuario?.rol;

    if (!nomina) {
      return res.status(400).json({ error: "Usuario sin nómina en sesión" });
    }

    // 🔹 Admin => acceso a todos los módulos
    if (rol === "admin") {
      const todosLosModulos = [
        "expedientes", "recibos", "cierredecaja", "medico",
        "ordenes", "optometria", "insumos", "usuarios",
        "agendaquirurgica", "asignarmodulos"
      ];

      return res.json(todosLosModulos.map(m => ({
        modulo: m,
        permitido: true
      })));
    }

    // 🔹 Usuario normal => permisos según BD
    const result = await pool.query(
      'SELECT modulo, permitido FROM permisos WHERE usuario_nomina = $1',
      [nomina]
    );

    const permisos = result.rows.map(p => ({
      modulo: p.modulo ? p.modulo.trim().toLowerCase().replace(/\s+/g, '') : "",
      permitido: p.permitido
    }));

    // Si no tiene ninguno → devolver arreglo vacío
    res.json(permisos.length ? permisos : []);
  } catch (err) {
    console.error("Error al obtener permisos:", err);
    res.status(500).json([]);
  }
});




// ==================== SITEMAP DINÁMICO ====================
const fs = require('fs');
const { SitemapStream, streamToPromise } = require('sitemap');

app.get('/sitemap.xml', async (req, res) => {
    try {
        const hostname = "https://oftavision.shop";

        const folders = [
            path.join(__dirname, "frontend"),
            path.join(__dirname, "login")
        ];

        let urls = [
            { url: "/", changefreq: "daily", priority: 1.0 }
        ];

        folders.forEach(folder => {
            if (fs.existsSync(folder)) {
                fs.readdirSync(folder).forEach(file => {
                    if (file.endsWith(".html")) {
                        urls.push({
                            url: `/${path.basename(folder)}/${file}`,
                            changefreq: "weekly",
                            priority: 0.7
                        });
                    }
                });
            }
        });

        const sitemapStream = new SitemapStream({ hostname });
        res.header('Content-Type', 'application/xml');
        const xml = await streamToPromise(
            urls.reduce((sm, u) => { sitemapStream.write(u); return sm; }, sitemapStream)
        );
        sitemapStream.end();
        res.send(xml.toString());

    } catch (err) {
        console.error("Error generando sitemap:", err);
        res.status(500).end();
    }
});


app.listen(3000, "0.0.0.0", () => {
    console.log("Servidor corriendo en puerto 3000 en todas las interfaces");
});

/*
app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});*/