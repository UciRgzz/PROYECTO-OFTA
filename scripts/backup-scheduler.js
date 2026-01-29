const cron = require('node-cron');
const { createBackup } = require('./backup');

console.log('📅 Programador de backups iniciado');
console.log('⏰ Los backups se ejecutarán diariamente a las 2:00 AM');

// Ejecutar backup diariamente a las 2:00 AM
cron.schedule('0 2 * * *', () => {
  console.log('⏰ Ejecutando backup programado...');
  createBackup();
});

// Mantener el proceso corriendo
process.on('SIGINT', () => {
  console.log('🛑 Programador de backups detenido');
  process.exit();
});