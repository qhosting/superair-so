
import express from 'express';
import * as db from './db.js';
import * as services from './services.js';
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

// --- CMS & BUILDER ENDPOINTS ---

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

// AI: Copywriter para el Builder
app.post('/api/ai/copywrite', async (req, res) => {
    const { field, context, currentText } = req.body;
    try {
        const prompt = `Actúa como un experto en Marketing para empresas de Aire Acondicionado (SuperAir).
        Mejora el siguiente texto para un sitio web profesional.
        Campo: ${field} (ej: Título, Subtítulo)
        Contexto de la sección: ${context}
        Texto actual: "${currentText}"
        Reglas: Debe ser persuasivo, técnico y breve. Máximo 15 palabras para títulos, 30 para subtítulos.
        Responde solo con el texto mejorado, sin comillas.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        res.json({ improvedText: response.text.trim() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OTROS ENDPOINTS (MANTENIDOS) ---
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
