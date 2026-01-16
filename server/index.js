
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp } from './services.js';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

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

// --- CMS ENDPOINTS (FIXED) ---

app.get('/api/cms/content', async (req, res) => {
    try {
        const result = await db.query("SELECT content FROM cms_content LIMIT 1");
        if (result.rows.length === 0) {
            return res.json([]); // Retornar array vacío si no hay nada
        }
        // Si el contenido ya es un objeto (JSONB), se envía directo. 
        // Si es un string, intentamos parsearlo antes de enviar para asegurar pureza JSON.
        const content = typeof result.rows[0].content === 'string' 
            ? JSON.parse(result.rows[0].content) 
            : result.rows[0].content;
        
        res.json(content || []);
    } catch (e) {
        console.error("CMS Load Error:", e);
        res.status(500).json({ error: "Error cargando contenido del CMS" });
    }
});

app.post('/api/cms/content', async (req, res) => {
    const { content } = req.body;
    try {
        // Upsert simple: borrar y re-insertar o actualizar
        await db.query("DELETE FROM cms_content");
        await db.query("INSERT INTO cms_content (content, updated_at) VALUES ($1, NOW())", [JSON.stringify(content)]);
        res.json({ success: true });
    } catch (e) {
        console.error("CMS Save Error:", e);
        res.status(500).json({ error: "Error guardando contenido" });
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No hay archivo" });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url });
});

// --- RESTO DE ENDPOINTS ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Módulos simplificados para que el sistema no falle al iniciar
app.get('/api/appointments', async (req, res) => {
    try { const r = await db.query("SELECT * FROM appointments ORDER BY date DESC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/clients', async (req, res) => {
    try { const r = await db.query("SELECT * FROM clients ORDER BY name ASC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/products', async (req, res) => {
    try { const r = await db.query("SELECT * FROM products ORDER BY name ASC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/leads', async (req, res) => {
    try { const r = await db.query("SELECT * FROM leads ORDER BY created_at DESC"); res.json(r.rows); }
    catch(e) { res.json([]); }
});

app.get('/api/settings/public', async (req, res) => {
    try {
        const r = await db.query("SELECT data FROM app_settings WHERE category = 'general_info'");
        res.json(r.rows[0]?.data || { isMaintenance: false });
    } catch(e) { res.json({ isMaintenance: false }); }
});

app.listen(3000, () => console.log(`🚀 SuperAir Backend on port 3000`));
