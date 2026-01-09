import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (incluyendo las del sistema/Docker)
  // FIX: use '.' instead of process.cwd() to avoid TS error about 'cwd' not existing on 'Process'
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Inyectar process.env.API_KEY en el código del cliente durante el build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 3000,
      host: '0.0.0.0'
    }
  };
});