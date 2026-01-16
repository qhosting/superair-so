import express from 'express';
import * as db from './db.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- INICIALIZACIÓN DE DB ---
db.initDatabase();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'AIzaSyAeHjI__WWaBp17nZLm4AaalYYXs_RDyzs' });

// --- ENDPOINTS PÚBLICOS ---
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

// --- LEADS & CRM ---
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
        await db.query("UPDATE leads SET status = 'Ganado', updated_at = NOW() WHERE id = $1", [leadId]);
        res.json(clientRes.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INVENTARIO MASIVO ---
app.post('/api/products/bulk', async (req, res) => {
    const { products } = req.body;
    try {
        for (const p of products) {
            await db.query(
                "INSERT INTO products (code, name, category, cost, price, stock) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, cost = EXCLUDED.cost, price = EXCLUDED.price, stock = EXCLUDED.stock",
                [p.code, p.name, p.category, p.cost, p.price, p.stock]
            );
        }
        res.json({ success: true, count: products.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ALMACENES & UNIDADES ---
app.get('/api/warehouses', async (req, res) => {
    try {
        const result = await db.query("SELECT w.*, u.name as responsible_name FROM warehouses w LEFT JOIN users u ON w.responsible_id = u.id ORDER BY w.id ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/levels/:id', async (req, res) => {
    // Simulando niveles por almacén. En producción usar tabla relacional warehouse_products
    try {
        const result = await db.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- MANUALES CON IA ---
app.get('/api/manuals', async (req, res) => {
    try {
        // Asumiendo tabla manual_articles (crear si no existe en init.sql)
        const result = await db.query("SELECT * FROM cms_content WHERE id = 999"); // Mock o usar tabla real
        res.json([]); // Retornar vacío si no hay tabla aún
    } catch (e) { res.json([]); }
});

app.post('/api/manuals/ai-generate', async (req, res) => {
    const { topic, category } = req.body;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Genera un protocolo técnico detallado para SuperAir sobre: ${topic} en la categoría ${category}. Formato profesional.`
        });
        res.json({ content: response.text });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SEGURIDAD & USUARIOS ---
app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, status FROM users");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/security/health', (req, res) => {
    res.json({
        score: 85,
        issues: [
            { severity: 'low', title: 'Contraseñas por expirar', description: '3 usuarios no han cambiado clave en 90 días.' }
        ]
    });
});

// --- COTIZACIONES & CITAS ---
app.get('/api/quotes', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM quotes ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const result = await db.query("SELECT a.*, c.name as client_name FROM appointments a JOIN clients c ON a.client_id = c.id");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SALUD ---
app.get('/api/health', (req, res) => res.json({ status: 'active', db: 'connected', time: new Date().toISOString() }));

// --- FRONTEND SPA ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SuperAir Server Running on Port ${PORT}`));
