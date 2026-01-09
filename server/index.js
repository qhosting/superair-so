
const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

// IMPORTANTE: En Docker/Easypanel debemos escuchar en 0.0.0.0, no en localhost
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Verificar conexión a DB al iniciar (sin detener el servidor si falla)
db.checkConnection().catch(err => console.error('DB Init Error:', err.message));

// Servir archivos estáticos generados por el build de React
app.use(express.static(path.join(__dirname, '../dist')));

// Endpoint de salud del sistema y DB (Vital para Health Checks de Easypanel)
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as time');
    res.json({ 
      status: 'ok', 
      system: 'SuperAir ERP', 
      db_time: result.rows[0].time,
      db_connected: true 
    });
  } catch (error) {
    console.error('Health Check Failed:', error.message);
    res.status(500).json({ 
      status: 'error', 
      db_connected: false,
      error: error.message 
    });
  }
});

// Manejar cualquier otra ruta devolviendo el index.html (SPA Routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Escuchar explícitamente en HOST 0.0.0.0
app.listen(PORT, HOST, () => {
  console.log(`🚀 SuperAir Server corriendo en http://${HOST}:${PORT}`);
  console.log(`📂 Sirviendo aplicación desde ${path.join(__dirname, '../dist')}`);
});
