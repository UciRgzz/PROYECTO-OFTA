const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const csv = require('csv-parser');

// ==================== CONFIGURACIÓN DE CONEXIÓN ====================
// nota; node backend/cargarUsuarios.js para añadir usuarios desde CSV
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Optavision',
    password: '12345',
    port: 5432
});

const archivoCSV = path.join(__dirname, 'data', 'usuarios.csv');

// ==================== FUNCIÓN PRINCIPAL ====================
async function cargarUsuarios() {
    const usuarios = [];

    // Leer CSV
    fs.createReadStream(archivoCSV)
        .pipe(csv())
        .on('data', (row) => {
            usuarios.push(row);
        })
        .on('end', async () => {
            console.log(`📄 Leídos ${usuarios.length} usuarios desde CSV.`);

            try {
                for (let usuario of usuarios) {
                    const { nomina, username, password, rol = 'usuario', departamento = null } = usuario;

                    let finalPassword = password.trim();

                    // 👉 Evitar doble hash
                    if (!finalPassword.startsWith("$2b$")) {
                        finalPassword = await bcrypt.hash(finalPassword, 10);
                    }

                    await pool.query(
                        `INSERT INTO usuarios (nomina, username, password, rol, departamento) 
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (nomina)
                         DO UPDATE SET username=$2, password=$3, rol=$4, departamento=$5`,
                        [nomina.trim(), username.trim(), finalPassword, rol.trim(), departamento ? departamento.trim() : null]
                    );

                    console.log(`✅ Usuario ${username} insertado/actualizado correctamente.`);
                }

                console.log("🚀 Carga de usuarios completada.");
                pool.end();
            } catch (err) {
                console.error("❌ Error al cargar usuarios:", err);
                pool.end();
            }
        });
}

cargarUsuarios();
