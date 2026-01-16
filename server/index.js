
import express from 'express';
import * as db from './db.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// --- INICIALIZACIÓN DE DB ---
db.initDatabase();

// --- CONFIGURACIÓN DE CARGA DE ARCHIVOS ---
const upload = multer({ dest: 'uploads/' });

// --- ENDPOINTS PÚBLICOS (CMS & SETTINGS) ---
app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings WHERE category IN ('general_info', 'quote_design')");
        const settings = {};
        result.rows.forEach(row => settings[row.category] = row.data);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cms/content', async (req, res) => {
    try {
        const result = await db.query("SELECT content FROM cms_content ORDER BY updated_at DESC LIMIT 1");
        res.json(result.rows[0]?.content || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cms/content', async (req, res) => {
    try {
        const { content } = req.body;
        await db.query("INSERT INTO cms_content (content) VALUES ($1)", [JSON.stringify(content)]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE LEADS & CRM ---
app.get('/api/leads', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM leads ORDER BY created_at DESC");
        res.json(result.rows.map(r => ({ ...r, createdAt: r.created_at, updatedAt: r.updated_at })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/leads', async (req, res) => {
    const { name, email, phone, source, notes } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO leads (name, email, phone, source, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, email, phone, source || 'Web', notes]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE CLIENTES 360 ---
app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/360', async (req, res) => {
    try {
        const client = await db.query("SELECT * FROM clients WHERE id = $1", [req.params.id]);
        const assets = await db.query("SELECT * FROM client_assets WHERE client_id = $1", [req.params.id]);
        const quotes = await db.query("SELECT * FROM quotes WHERE client_id = $1", [req.params.id]);
        const appointments = await db.query("SELECT * FROM appointments WHERE client_id = $1", [req.params.id]);
        res.json({ client: client.rows[0], assets: assets.rows, quotes: quotes.rows, appointments: appointments.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE COTIZACIONES ---
app.get('/api/quotes', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM quotes ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/quotes/public/:token', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM quotes WHERE public_token = $1", [req.params.token]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE INVENTARIO & ALMACENES ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/warehouses', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT w.*, u.name as responsible_name 
            FROM warehouses w 
            LEFT JOIN users u ON w.responsible_id = u.id 
            ORDER BY w.name ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE CITAS ---
app.get('/api/appointments', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, c.name as client_name 
            FROM appointments a 
            LEFT JOIN clients c ON a.client_id = c.id 
            ORDER BY date ASC, time ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SALUD DEL SISTEMA ---
app.get('/api/health', (req, res) => res.json({ status: 'active', db: 'connected', time: new Date().toISOString() }));

// --- SERVIDO DE ARCHIVOS ESTÁTICOS (FRONTEND PRODUCCIÓN) ---
const distPath = path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
    console.log("📁 Sirviendo frontend desde:", distPath);
    app.use(express.static(distPath));
    
    // Fallback para SPA (React Router)
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.warn("⚠️ Carpeta 'dist' no detectada. Verifique el build de Vite.");
    app.get('/', (req, res) => {
        res.send("SuperAir Backend Online - Frontend en desarrollo.");
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    🚀 SUPER AIR ERP OPERATIVO
    --------------------------
    Puerto: ${PORT}
    Entorno: ${process.env.NODE_ENV}
    --------------------------
    `);
});
