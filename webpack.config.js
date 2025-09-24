const path = require('path');

module.exports = {
  entry: './frontend/script.js',   // tu archivo de entrada
  output: {
    filename: 'bundle.min.js',     // archivo de salida
    path: path.resolve(__dirname, 'frontend/dist'), // carpeta donde se guarda
  },
  mode: 'production', // minifica automáticamente
};
