
import express from 'express';
import * as db from './db.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";

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

// --- CLIENTS & 360 VIEW ---
app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/360', async (req, res) => {
    const { id } = req.params;
    try {
        const clientRes = await db.query("SELECT * FROM clients WHERE id = $1", [id]);
        const assetsRes = await db.query("SELECT * FROM client_assets WHERE client_id = $1", [id]);
        const quotesRes = await db.query("SELECT * FROM quotes WHERE client_id = $1 ORDER BY created_at DESC", [id]);
        const apptsRes = await db.query("SELECT * FROM appointments WHERE client_id = $1 ORDER BY date DESC", [id]);

        res.json({
            client: clientRes.rows[0],
            assets: assetsRes.rows,
            quotes: quotesRes.rows,
            appointments: apptsRes.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', async (req, res) => {
    const { name, email, phone, address, rfc, type } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO clients (name, email, phone, address, rfc, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, email, phone, address, rfc, type]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients/:id/assets', async (req, res) => {
    const { id } = req.params;
    const { brand, model, btu, type, install_date } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO client_assets (client_id, brand, model, btu, type, install_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [id, brand, model, btu, type, install_date]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients/:id/ai-analysis', async (req, res) => {
    const { id } = req.params;
    try {
        const assets = await db.query("SELECT * FROM client_assets WHERE client_id = $1", [id]);
        const client = await db.query("SELECT name FROM clients WHERE id = $1", [id]);
        
        const context = assets.rows.map(a => `${a.type} ${a.brand} ${a.btu}BTU (Instalado: ${a.install_date})`).join(', ');
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Actúa como un Ingeniero Senior de HVAC de SuperAir México. 
                      Cliente: ${client.rows[0].name}. 
                      Equipos instalados: ${context}. 
                      Estamos en temporada de olas de calor en México. 
                      Genera un diagnóstico técnico proactivo de 3 puntos sobre qué equipos corren más riesgo y por qué necesitan mantenimiento preventivo urgente. 
                      Usa un tono profesional y alarmante pero justificado.`
        });
        
        res.json({ analysis: response.text });
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

// --- SEGURIDAD & USUARIOS ---
app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, status FROM users");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
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
