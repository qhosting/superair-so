
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

// --- SETTINGS (FIXED FOR JSON PARSING) ---

app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings");
        const settings = {};
        // Si no hay resultados, devolvemos un objeto vacío pero VÁLIDO
        result.rows.forEach(row => { 
            settings[row.category] = typeof row.data === 'string' ? JSON.parse(row.data) : row.data; 
        });
        res.json(settings);
    } catch (e) { 
        console.error("Settings Load Error:", e);
        res.status(500).json({ error: "Internal server error loading settings", details: e.message }); 
    }
});

app.post('/api/settings', async (req, res) => {
    const { category, data } = req.body;
    try {
        await db.query(`
            INSERT INTO app_settings (category, data) VALUES ($1, $2)
            ON CONFLICT (category) DO UPDATE SET data = $2
        `, [category, JSON.stringify(data)]);
        res.json({ success: true, category });
    } catch (e) { 
        res.status(500).json({ error: "Could not save settings", details: e.message }); 
    }
});

app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT data FROM app_settings WHERE category = 'general_info'");
        const data = result.rows[0]?.data;
        res.json(data ? (typeof data === 'string' ? JSON.parse(data) : data) : { isMaintenance: false });
    } catch (e) { 
        res.json({ isMaintenance: false }); 
    }
});

// --- AUTH & SECURITY ---

app.get('/api/audit-logs', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: "Audit logs unavailable" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@superair.com.mx' && password === 'admin123') {
        return res.json({
            user: { id: '1', name: 'Admin SuperAir', email, role: 'Super Admin', status: 'Activo' },
            token: 'superair_master_token'
        });
    }
    res.status(401).json({ error: "Credenciales inválidas" });
});

// --- CLIENTS ---
app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: "Error fetch clients" }); }
});

// --- CMS ---
app.get('/api/cms/content', async (req, res) => {
    try {
        const result = await db.query("SELECT content FROM cms_content LIMIT 1");
        if (result.rows.length === 0) return res.json([]);
        const content = typeof result.rows[0].content === 'string' ? JSON.parse(result.rows[0].content) : result.rows[0].content;
        res.json(content || []);
    } catch (e) { res.status(500).json({ error: "CMS error" }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// File Upload
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

app.listen(3000, () => console.log(`🚀 SuperAir Server Running - JSON Safety Active`));
