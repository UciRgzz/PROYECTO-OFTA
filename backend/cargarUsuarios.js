const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const csv = require('csv-parser');

// ==================== CONFIGURACIÓN DE CONEXIÓN ====================
//nota correr esto en la terminal para agg nuevos usuarios; node backend/cargarUsuarios.js//
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
                // ⚠️ OJO: esto borra todos los usuarios antes de cargar los nuevos
                // Si no quieres borrar, comenta la siguiente línea
                await pool.query('DELETE FROM usuarios');

                for (let usuario of usuarios) {
                    const { nomina, username, password, rol = 'usuario', departamento = null } = usuario;

                    const hashedPassword = await bcrypt.hash(password, 10);

                    await pool.query(
                        `INSERT INTO usuarios (nomina, username, password, rol, departamento) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [nomina.trim(), username.trim(), hashedPassword, rol.trim(), departamento ? departamento.trim() : null]
                    );

                    console.log(`✅ Usuario ${username} insertado correctamente.`);
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
