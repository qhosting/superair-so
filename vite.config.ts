
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 5173, // Puerto estándar de Vite
      host: '0.0.0.0',
      // Configuración del Proxy: Vital para desarrollo
      // Redirige llamadas de /api (Frontend) -> localhost:3000 (Backend)
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  };
});
