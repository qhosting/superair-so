
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

app.put('/api/leads/:id', async (req, res) => {
    const { status, history, notes } = req.body;
    try {
        const result = await db.query(
            "UPDATE leads SET status = COALESCE($1, status), history = COALESCE($2, history), notes = COALESCE($3, notes), updated_at = NOW() WHERE id = $4 RETURNING *",
            [status, JSON.stringify(history), notes, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CONVERTIR LEAD A CLIENTE (CRÍTICO) ---
app.post('/api/leads/:id/convert', async (req, res) => {
    const leadId = req.params.id;
    try {
        const leadRes = await db.query("SELECT * FROM leads WHERE id = $1", [leadId]);
        if (leadRes.rows.length === 0) return res.status(404).json({ error: 'Lead no encontrado' });
        const lead = leadRes.rows[0];

        const clientRes = await db.query(
            "INSERT INTO clients (name, email, phone, status, type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [lead.name, lead.email, lead.phone, 'Activo', 'Residencial']
        );
        const newClient = clientRes.rows[0];

        await db.query("UPDATE leads SET status = 'Ganado', updated_at = NOW() WHERE id = $1", [leadId]);

        res.json(newClient);
    } catch (e) {
        console.error("Error converting lead:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- ENDPOINTS DE CLIENTES ---
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

app.post('/api/quotes', async (req, res) => {
    const { client_id, client_name, total, status, payment_terms, items } = req.body;
    const token = Math.random().toString(36).substring(2, 15);
    try {
        const result = await db.query(
            "INSERT INTO quotes (client_id, client_name, total, status, payment_terms, items, public_token) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [client_id, client_name, total, status || 'Borrador', payment_terms, JSON.stringify(items), token]
        );
        res.json(result.rows[0]);
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

// --- SALUD ---
app.get('/api/health', (req, res) => res.json({ status: 'active', db: 'connected' }));

// --- SERVIDO DE FRONTEND (PRODUCCIÓN) ---
const distPath = path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => res.send("SuperAir Backend OK. Frontend dist no encontrado."));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SuperAir Server Running on Port ${PORT}`));
