
const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();

// Puerto para Easypanel / Docker
const PORT = process.env.PORT || 3000;

// Verificar conexión a DB al iniciar
db.checkConnection();

// Servir archivos estáticos generados por el build de React
// Nota: En Easypanel, el Dockerfile construirá la app en /app/dist
app.use(express.static(path.join(__dirname, '../dist')));

// Endpoint de salud del sistema y DB
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

app.listen(PORT, () => {
  console.log(`🚀 SuperAir Server corriendo en puerto ${PORT}`);
  console.log(`📂 Sirviendo aplicación desde ${path.join(__dirname, '../dist')}`);
});
