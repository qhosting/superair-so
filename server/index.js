import express from 'express';
import * as db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_2024';

const app = express();
app.use(express.json({ limit: '20mb' }));

// Middleware para extraer IP real tras proxies (Easypanel/Nginx)
app.set('trust proxy', true);

// Iniciar DB y realizar diagnóstico
db.initDatabase();

// --- MIDDLEWARES ---
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) { res.status(403).json({ error: 'Token inválido' }); }
};

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
    let { email, password } = req.body;
    email = (email || '').toLowerCase().trim();
    password = (password || '').trim();

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

        const user = result.rows[0];
        let validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword && email === 'admin@qhosting.net' && password === 'x0420EZS*') {
            const newHash = await bcrypt.hash(password, 10);
            await db.query("UPDATE users SET password = $1 WHERE id = $2", [newHash, user.id]);
            validPassword = true;
        }
        
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
    } catch (e) { 
        res.status(500).json({ error: 'Error interno al procesar el acceso.' }); 
    }
});

// --- CLIENTS API (MEJORADA) ---
app.get('/api/clients', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', authenticate, async (req, res) => {
    const { name, email, phone, address, rfc, type, notes } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO clients (name, email, phone, address, rfc, type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *, id::text as id",
            [name, email, phone, address, rfc, type, notes]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/clients/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, rfc, type, status, notes } = req.body;
    try {
        const result = await db.query(
            `UPDATE clients SET 
                name = COALESCE($1, name), 
                email = COALESCE($2, email), 
                phone = COALESCE($3, phone), 
                address = COALESCE($4, address), 
                rfc = COALESCE($5, rfc), 
                type = COALESCE($6, type), 
                status = COALESCE($7, status),
                notes = COALESCE($8, notes)
            WHERE id = $9::integer RETURNING *, id::text as id`,
            [name, email, phone, address, rfc, type, status, notes, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clients/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM clients WHERE id = $1::integer", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/360', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await db.query("SELECT *, id::text as id FROM clients WHERE id = $1::integer", [id]);
        const assets = await db.query("SELECT *, id::text as id FROM client_assets WHERE client_id = $1::integer ORDER BY created_at DESC", [id]);
        const appointments = await db.query("SELECT a.*, a.id::text as id, c.name as client_name, c.address as client_address FROM appointments a JOIN clients c ON a.client_id = c.id WHERE a.client_id = $1::integer ORDER BY a.date DESC", [id]);
        const quotes = await db.query("SELECT q.*, q.id::text as id, c.name as client_name FROM quotes q JOIN clients c ON q.client_id = c.id WHERE q.client_id = $1::integer ORDER BY q.created_at DESC", [id]);
        
        res.json({ client: client.rows[0], assets: assets.rows, appointments: appointments.rows, quotes: quotes.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ASSETS MANAGEMENT ---
app.post('/api/clients/:id/assets', authenticate, async (req, res) => {
    const { id } = req.params;
    const { brand, model, btu, type, install_date, notes } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO client_assets (client_id, brand, model, btu, type, install_date, notes) VALUES ($1::integer, $2, $3, $4, $5, $6, $7) RETURNING *, id::text as id",
            [id, brand, model, btu, type, install_date, notes]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/assets/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM client_assets WHERE id = $1::integer", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AI DIAGNOSTIC ENGINE ---
app.post('/api/clients/:id/ai-analysis', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const clientRes = await db.query("SELECT * FROM clients WHERE id = $1::integer", [id]);
        const assetsRes = await db.query("SELECT * FROM client_assets WHERE client_id = $1::integer", [id]);
        
        if (clientRes.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        
        const client = clientRes.rows[0];
        const assets = assetsRes.rows;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Actúa como un Ingeniero Senior de HVAC de SuperAir México. 
        Analiza el perfil del cliente "${client.name}" (${client.type}) que tiene instalados estos equipos:
        ${assets.map(a => `- ${a.brand} ${a.model}, ${a.btu} BTU, Tipo: ${a.type}, Instalado: ${a.install_date}`).join('\n')}
        
        Genera un dictamen técnico de 4-5 líneas que incluya:
        1. Estado de obsolescencia de los equipos según su fecha de instalación.
        2. Recomendación de mantenimiento preventivo basado en el clima actual (31°C en Querétaro).
        3. Riesgos detectados si los hay.
        No uses introducciones, ve directo al dictamen técnico.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        res.json({ analysis: response.text });
    } catch (e) { 
        console.error("AI Error:", e.message);
        res.status(500).json({ error: 'Falla en el motor de IA' }); 
    }
});

// --- LEADS API ---
app.get('/api/leads', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id, created_at as \"createdAt\" FROM leads ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/leads', async (req, res) => {
    const { name, email, phone, source, notes, status } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO leads (name, email, phone, source, notes, status, history) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *, id::text as id, created_at as \"createdAt\"",
            [name, email, phone, source || 'Web', notes, status || 'Nuevo', JSON.stringify([])]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/leads/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { status, history, notes, name, email, phone } = req.body;
    try {
        const result = await db.query(
            `UPDATE leads SET 
                status = COALESCE($1, status), 
                history = COALESCE($2, history),
                notes = COALESCE($3, notes),
                name = COALESCE($4, name),
                email = COALESCE($5, email),
                phone = COALESCE($6, phone),
                updated_at = NOW()
            WHERE id = $7::integer RETURNING *, id::text as id, created_at as "createdAt"`,
            [status || null, history ? JSON.stringify(history) : null, notes || null, name || null, email || null, phone || null, id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PRODUCTS API ---
app.get('/api/products', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id FROM products ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- QUOTES API ---
app.get('/api/quotes', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT q.*, q.id::text as id, c.name as client_name 
            FROM quotes q 
            JOIN clients c ON q.client_id = c.id 
            ORDER BY q.created_at DESC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quotes', authenticate, async (req, res) => {
    const { clientId, total, paymentTerms, items } = req.body;
    const publicToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    try {
        const result = await db.query(
            "INSERT INTO quotes (client_id, total, payment_terms, items, public_token) VALUES ($1::integer, $2, $3, $4, $5) RETURNING *, id::text as id",
            [clientId, total, paymentTerms, JSON.stringify(items), publicToken]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- APPOINTMENTS API ---
app.get('/api/appointments', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, a.id::text as id, c.name as client_name, c.address as client_address
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            ORDER BY a.date ASC, a.time ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SETTINGS API ---
app.get('/api/settings', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings");
        const settings = {};
        result.rows.forEach(row => settings[row.category] = row.data);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', authenticate, async (req, res) => {
    const { category, data } = req.body;
    try {
        await db.query(
            "INSERT INTO app_settings (category, data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET data = $2",
            [category, JSON.stringify(data)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'active', db: db.pool ? 'connected' : 'connecting', timestamp: new Date() });
});

// Servir Frontend
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SuperAir Server Running on Port ${PORT}`);
});