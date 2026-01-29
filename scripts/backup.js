const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración
require('dotenv').config();

const DB_USER = process.env.DB_USER || 'postgres';
const DB_NAME = process.env.DB_NAME || 'optadb';
const DB_PASSWORD = process.env.DB_PASSWORD;
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(BACKUP_DIR, `backup_optadb_${timestamp}.sql`);
  
  // Comando de backup
  const command = `set PGPASSWORD=${DB_PASSWORD} && pg_dump -U ${DB_USER} ${DB_NAME} > "${backupFile}"`;
  
  console.log('🔄 Iniciando backup de la base de datos...');
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error al crear backup:', error);
      return;
    }
    
    console.log(`✅ Backup creado exitosamente: ${backupFile}`);
    
    // Opcional: Eliminar backups antiguos (más de 30 días)
    cleanOldBackups();
  });
}

function cleanOldBackups() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          fs.unlink(filePath, (err) => {
            if (!err) console.log(`🗑️ Backup antiguo eliminado: ${file}`);
          });
        }
      });
    });
  });
}

// Ejecutar backup
createBackup();

module.exports = { createBackup };