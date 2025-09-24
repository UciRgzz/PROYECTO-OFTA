const path = require('path');
const JavaScriptObfuscator = require('webpack-obfuscator');

module.exports = {
  entry: './frontend/script.js', // Archivo de entrada
  output: {
    filename: 'bundle.min.js',   // Archivo de salida
    path: path.resolve(__dirname, 'frontend/dist'), // Carpeta de salida
  },
  mode: 'production', // Minificación automática
  plugins: [
    new JavaScriptObfuscator(
      {
        compact: true,                // Código en una sola línea
        controlFlowFlattening: true,  // Hace ilegible el flujo del programa
        controlFlowFlatteningThreshold: 0.75,
        rotateStringArray: true,      // Rota arrays de strings
        stringArray: true,            // Mueve strings a un array
        stringArrayEncoding: ['base64'], // Codifica strings en base64
        stringArrayThreshold: 0.75,   // % de strings que serán transformados
        deadCodeInjection: true,      // Inserta código basura
        deadCodeInjectionThreshold: 0.4,
        selfDefending: true,          // Protege contra formateo y debugging
        disableConsoleOutput: true    // Quita console.log / console.error
      },
      []
    )
  ]
};
