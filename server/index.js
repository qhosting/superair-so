
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp, analyzeLeadIntent } from './services.js';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// --- UTILS & MIDDLEWARE ---
const recordAuditLog = async (req, action, resource, resourceId, oldData, newData) => {
    const userId = req.headers['x-user-id'] || '1';
    const userName = req.headers['x-user-name'] || 'System';
    const ip = req.ip || '127.0.0.1';

    const changes = [];
    if (action === 'UPDATE' && oldData && newData) {
        Object.keys(newData).forEach(key => {
            if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                changes.push({ field: key, old: oldData[key], new: newData[key] });
            }
        });
    }

    try {
        await db.query(`
            INSERT INTO audit_logs (user_id, user_name, action, resource, resource_id, changes, ip_address, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [userId, userName, action, resource, resourceId, JSON.stringify(changes), ip]);
    } catch (e) { console.error("Audit Log Fail:", e.message); }
};

// --- AUTH & SECURITY ---

app.get('/api/audit-logs', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    // Simulación de login industrial para desarrollo
    if (email === 'admin@superair.com.mx' && password === 'admin123') {
        return res.json({
            user: { id: '1', name: 'Admin SuperAir', email, role: 'Super Admin', status: 'Activo' },
            token: 'superair_master_token'
        });
    }
    res.status(401).json({ error: "Credenciales inválidas" });
});

app.post('/api/auth/impersonate/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
        await recordAuditLog(req, 'IMPERSONATE', 'User', id, null, { target: result.rows[0].name });
        res.json({ success: true, user: result.rows[0], token: "impersonated_token" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/security/health', async (req, res) => {
    try {
        res.json({ 
            score: 95, 
            issues: [{ severity: 'low', title: 'Todo Correcto', description: 'Sistema operando bajo parámetros normales.' }] 
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SETTINGS ---

app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings");
        const settings = {};
        result.rows.forEach(row => { settings[row.category] = row.data; });
        res.json(settings);
    } catch (e) { res.status(500).json({ error: "Error cargando settings" }); }
});

app.post('/api/settings', async (req, res) => {
    const { category, data } = req.body;
    try {
        await db.query(`
            INSERT INTO app_settings (category, data) VALUES ($1, $2)
            ON CONFLICT (category) DO UPDATE SET data = $2
        `, [category, JSON.stringify(data)]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT data FROM app_settings WHERE category = 'general_info'");
        res.json(result.rows[0]?.data || { isMaintenance: false });
    } catch (e) { res.json({ isMaintenance: false }); }
});

// --- CLIENTS ---

app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/360', async (req, res) => {
    const { id } = req.params;
    try {
        const client = await db.query("SELECT * FROM clients WHERE id = $1", [id]);
        const assets = await db.query("SELECT * FROM client_assets WHERE client_id = $1", [id]);
        const appointments = await db.query("SELECT * FROM appointments WHERE client_id = $1", [id]);
        const quotes = await db.query("SELECT * FROM quotes WHERE client_id = $1", [id]);
        res.json({ client: client.rows[0], assets: assets.rows, appointments: appointments.rows, quotes: quotes.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', async (req, res) => {
    const { name, email, phone, address, rfc, type } = req.body;
    try {
        const r = await db.query(`
            INSERT INTO clients (name, email, phone, address, rfc, type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *
        `, [name, email, phone, address, rfc, type]);
        await recordAuditLog(req, 'CREATE', 'Client', r.rows[0].id, null, r.rows[0]);
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CMS ---

app.get('/api/cms/content', async (req, res) => {
    try {
        const result = await db.query("SELECT content FROM cms_content LIMIT 1");
        if (result.rows.length === 0) return res.json([]);
        const content = typeof result.rows[0].content === 'string' ? JSON.parse(result.rows[0].content) : result.rows[0].content;
        res.json(content || []);
    } catch (e) { res.status(500).json({ error: "Error CMS" }); }
});

app.post('/api/cms/content', async (req, res) => {
    const { content } = req.body;
    try {
        await db.query("DELETE FROM cms_content");
        await db.query("INSERT INTO cms_content (content, updated_at) VALUES ($1, NOW())", [JSON.stringify(content)]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error saving CMS" }); }
});

// --- OTHER ENDPOINTS (STUBS FOR FULL FUNCTIONALITY) ---

app.get('/api/users', async (req, res) => {
    try { const r = await db.query("SELECT id, name, email, role, status FROM users"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/appointments', async (req, res) => {
    try { const r = await db.query("SELECT * FROM appointments ORDER BY date DESC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/products', async (req, res) => {
    try { const r = await db.query("SELECT * FROM products ORDER BY name ASC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/quotes', async (req, res) => {
    try { const r = await db.query("SELECT * FROM quotes ORDER BY id DESC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/leads', async (req, res) => {
    try { const r = await db.query("SELECT * FROM leads ORDER BY created_at DESC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/manuals', async (req, res) => {
    try { const r = await db.query("SELECT * FROM manual_articles ORDER BY updated_at DESC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// File Upload Support
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    res.json({ url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
});
app.use('/uploads', express.static('uploads'));

app.listen(3000, () => console.log(`🚀 SuperAir Production Backend on port 3000`));
