
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp } from './services.js';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// --- UTILS ---
const recordAuditLog = async (req, action, resource, resourceId, oldData, newData) => {
    const userId = req.headers['x-user-id'] || '1'; // Fallback admin
    const userName = req.headers['x-user-name'] || 'System';
    const ip = req.ip;

    const changes = [];
    if (action === 'UPDATE' && oldData && newData) {
        Object.keys(newData).forEach(key => {
            if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                changes.push({ field: key, old: oldData[key], new: newData[key] });
            }
        });
    }

    if (changes.length > 0 || action === 'CREATE' || action === 'DELETE' || action === 'IMPERSONATE') {
        try {
            await db.query(`
                INSERT INTO audit_logs (user_id, user_name, action, resource, resource_id, changes, ip_address, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [userId, userName, action, resource, resourceId, JSON.stringify(changes), ip]);
        } catch (e) { console.error("Audit Logging Failed:", e); }
    }
};

// --- ENDPOINTS SEGURIDAD ---

app.get('/api/audit-logs', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: "Logs unavailable" }); }
});

app.post('/api/auth/impersonate/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
        
        const targetUser = result.rows[0];
        await recordAuditLog(req, 'IMPERSONATE', 'User', id, null, { target: targetUser.name });
        
        // En un entorno real, aquí generaríamos un nuevo JWT
        res.json({ success: true, user: targetUser, token: "impersonated_token_mock" });
    } catch (e) { res.status(500).json({ error: "Impersonation failed" }); }
});

app.get('/api/security/health', async (req, res) => {
    try {
        // Análisis heurístico simulado basado en datos reales de la BD
        const oldPasswords = await db.query("SELECT count(*) FROM users WHERE last_password_change < NOW() - INTERVAL '90 days'");
        const inactiveAdmins = await db.query("SELECT count(*) FROM users WHERE role IN ('Admin', 'Super Admin') AND last_login < NOW() - INTERVAL '30 days'");
        
        const issues = [];
        if (parseInt(oldPasswords.rows[0].count) > 0) {
            issues.push({ severity: 'medium', title: 'Contraseñas Antiguas', description: `${oldPasswords.rows[0].count} usuarios no han cambiado su clave en 90 días.` });
        }
        if (parseInt(inactiveAdmins.rows[0].count) > 0) {
            issues.push({ severity: 'high', title: 'Admins Inactivos', description: 'Cuentas con altos privilegios sin uso. Riesgo de seguridad.' });
        }
        
        res.json({ 
            score: Math.max(100 - (issues.length * 15), 0),
            issues: issues.length > 0 ? issues : [{ severity: 'low', title: 'Sistema Saludable', description: 'No se detectaron brechas críticas hoy.' }]
        });
    } catch (e) { res.json({ score: 0, issues: [] }); }
});

// Configuración de almacenamiento para imágenes reales
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// --- CMS ENDPOINTS ---

app.get('/api/cms/content', async (req, res) => {
    try {
        const result = await db.query("SELECT content FROM cms_content LIMIT 1");
        if (result.rows.length === 0) return res.json([]);
        const content = typeof result.rows[0].content === 'string' ? JSON.parse(result.rows[0].content) : result.rows[0].content;
        res.json(content || []);
    } catch (e) { res.status(500).json({ error: "Error cargando contenido" }); }
});

app.post('/api/cms/content', async (req, res) => {
    const { content } = req.body;
    try {
        await db.query("DELETE FROM cms_content");
        await db.query("INSERT INTO cms_content (content, updated_at) VALUES ($1, NOW())", [JSON.stringify(content)]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error guardando contenido" }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, status, last_login as \"lastLogin\" FROM users ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.json([]); }
});

app.listen(3000, () => console.log(`🚀 SuperAir Backend with Audit Logs on port 3000`));
