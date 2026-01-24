
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

// Iniciar DB y realizar diagnóstico
db.initDatabase().then(async () => {
    try {
        const usersCount = await db.query("SELECT count(*) FROM users");
        const adminCheck = await db.query("SELECT email, role FROM users WHERE email = 'admin@qhosting.net'");
        console.log(`[DB STATUS] Total usuarios: ${usersCount.rows[0].count}`);
        if (adminCheck.rows.length > 0) {
            console.log(`[DB STATUS] Admin qhosting encontrado con rol: ${adminCheck.rows[0].role}`);
        } else {
            console.error(`[DB ERROR] Admin qhosting NO encontrado en la base de datos.`);
        }
    } catch (e) {
        console.error("[DB DIAGNOSTIC ERROR]", e.message);
    }
});

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
    const { email, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Email: ${email}`);
    
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
        
        if (result.rows.length === 0) {
            console.warn(`[LOGIN FAILED] Usuario no encontrado: ${email}`);
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            console.warn(`[LOGIN FAILED] Contraseña incorrecta para: ${email}`);
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        console.log(`[LOGIN SUCCESS] Usuario: ${email} (${user.role})`);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
        });
    } catch (e) { 
        console.error(`[LOGIN ERROR] ${e.message}`);
        res.status(500).json({ error: e.message }); 
    }
});

// --- CLIENTS ---
app.get('/api/clients', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', authenticate, async (req, res) => {
    const { name, email, phone, address, rfc, type } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO clients (name, email, phone, address, rfc, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, email, phone, address, rfc, type]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/360', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await db.query("SELECT * FROM clients WHERE id = $1", [id]);
        const assets = await db.query("SELECT * FROM client_assets WHERE client_id = $1", [id]);
        const appointments = await db.query("SELECT * FROM appointments WHERE client_id = $1 ORDER BY date DESC", [id]);
        const quotes = await db.query("SELECT * FROM quotes WHERE client_id = $1 ORDER BY created_at DESC", [id]);
        
        res.json({
            client: client.rows[0],
            assets: assets.rows,
            appointments: appointments.rows,
            quotes: quotes.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- LEADS ---
app.get('/api/leads', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM leads ORDER BY created_at DESC");
        res.json(result.rows);
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

// --- PRODUCTS & INVENTORY ---
app.get('/api/products', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', authenticate, async (req, res) => {
    const { code, name, description, price, cost, stock, min_stock, category, unit_of_measure } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO products (code, name, description, price, cost, stock, min_stock, category, unit_of_measure) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
            [code, name, description, price, cost, stock, min_stock, category, unit_of_measure]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- QUOTES ---
app.get('/api/quotes', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT q.*, c.name as client_name 
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
            "INSERT INTO quotes (client_id, total, payment_terms, items, public_token) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [clientId, total, paymentTerms, JSON.stringify(items), publicToken]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cotización Pública
app.get('/api/quotes/public/:token', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT q.*, c.name as client_name, c.email as client_email, c.phone as client_phone
            FROM quotes q 
            JOIN clients c ON q.client_id = c.id 
            WHERE q.public_token = $1
        `, [req.params.token]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cotización no encontrada' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- APPOINTMENTS ---
app.get('/api/appointments', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, c.name as client_name, c.address as client_address
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            ORDER BY a.date ASC, a.time ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', authenticate, async (req, res) => {
    const { client_id, technician, date, time, duration, type, notes } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO appointments (client_id, technician_name, date, time, duration, type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [client_id, technician, date, time, duration, type, notes]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SETTINGS ---
app.get('/api/settings', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings");
        const settings = {};
        result.rows.forEach(row => settings[row.category] = row.data);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings WHERE category IN ('general_info', 'quote_design')");
        const settings = {};
        result.rows.forEach(row => settings[row.category] = row.data);
        res.json({
            companyName: settings.general_info?.companyName || 'SuperAir',
            logoUrl: settings.general_info?.logoUrl,
            isMaintenance: settings.general_info?.isMaintenance,
            quote_design: settings.quote_design
        });
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

// --- AI INTEGRATION (GEMINI) ---
app.post('/api/ai/chat', authenticate, async (req, res) => {
    const { message } = req.body;
    try {
        if (!process.env.API_KEY) throw new Error("API_KEY no configurada en el servidor.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Eres el copiloto experto del ERP SuperAir. Responde de forma técnica pero concisa a: ${message}`,
        });
        res.json({ reply: response.text });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SYSTEM ---
app.get('/api/health', (req, res) => res.json({ status: 'active', db: 'connected', timestamp: new Date() }));

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
app.listen(PORT, () => console.log(`🚀 Servidor ERP SuperAir corriendo en puerto ${PORT}`));
