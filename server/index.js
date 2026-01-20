
import express from 'express';
import * as db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

db.initDatabase();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CONFIGURACIONES (SETTINGS) ---

// Obtener todas las configuraciones para el panel de admin
app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings");
        const settings = {};
        result.rows.forEach(row => {
            settings[row.category] = row.data;
        });
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener configuraciones públicas (Logo, Nombre, Maintenance) para la Landing
app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings WHERE category IN ('general_info', 'quote_design')");
        const publicSettings = {};
        result.rows.forEach(row => {
            if (row.category === 'general_info') {
                publicSettings.companyName = row.data.companyName;
                publicSettings.logoUrl = row.data.logoUrl;
                publicSettings.isMaintenance = row.data.isMaintenance;
            }
            if (row.category === 'quote_design') {
                publicSettings.quote_design = row.data;
            }
        });
        res.json(publicSettings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Guardar configuración por categoría
app.post('/api/settings', async (req, res) => {
    const { category, data } = req.body;
    try {
        await db.query(
            "INSERT INTO app_settings (category, data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET data = $2",
            [category, JSON.stringify(data)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mock de subida de archivos para logos (En producción usar S3 o Cloudinary)
app.post('/api/upload', (req, res) => {
    // Por brevedad, simulamos la subida devolviendo una URL base64 o placeholder
    // En una implementación real se usaría multer y se guardaría el buffer
    res.json({ url: 'https://cdn-icons-png.flaticon.com/512/1169/1169382.png', status: 'success' });
});

// --- CMS & MANUALS (EXISTENTES) ---

app.get('/api/cms/content', async (req, res) => {
    try {
        const result = await db.query("SELECT data FROM app_settings WHERE category = 'landing_content'");
        res.json(result.rows[0]?.data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cms/content', async (req, res) => {
    try {
        const { content } = req.body;
        await db.query(
            "INSERT INTO app_settings (category, data) VALUES ('landing_content', $1) ON CONFLICT (category) DO UPDATE SET data = $1",
            [JSON.stringify(content)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/manuals', async (req, res) => {
    const userId = req.headers['x-user-id'] || 0;
    try {
        const result = await db.query(`
            SELECT a.*, 
            EXISTS(SELECT 1 FROM manual_reads r WHERE r.article_id = a.id AND r.user_id = $1) as is_read
            FROM manual_articles a 
            ORDER BY a.updated_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'active', db: 'connected' }));

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
