
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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'AIzaSyAeHjI__WWaBp17nZLm4AaalYYXs_RDyzs' });

// --- MANUAL OPERATIVO & KNOWLEDGE BASE ---

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

app.post('/api/manuals', async (req, res) => {
    const { title, category, content, version, author_name, pdf_url } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO manual_articles (title, category, content, version, author_name, pdf_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [title, category, content, version, author_name, pdf_url]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/manuals/:id/mark-read', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
        await db.query(
            "INSERT INTO manual_reads (article_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [id, userId]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI: Asistente Técnico (RAG Lite)
app.post('/api/manuals/ai-ask', async (req, res) => {
    const { question } = req.body;
    try {
        // Obtener contexto de los manuales
        const manualsRes = await db.query("SELECT title, content FROM manual_articles");
        const context = manualsRes.rows.map(r => `Manual: ${r.title}\nContenido: ${r.content}`).join('\n\n');

        const prompt = `Actúa como el Ingeniero Jefe de Soporte de SuperAir de México.
        A continuación tienes los manuales de la empresa:
        ${context}

        Responde a la siguiente duda técnica de un instalador en campo basándote estrictamente en los manuales de arriba.
        Si no está en los manuales, indica que debe contactar a supervisión.
        Pregunta: "${question}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        res.json({ reply: response.text });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI: Generador de Borradores de Manuales
app.post('/api/manuals/ai-generate', async (req, res) => {
    const { topic, category } = req.body;
    try {
        const prompt = `Redacta un protocolo técnico profesional para SuperAir (empresa HVAC de México) sobre: "${topic}" en la categoría de "${category}".
        Usa un lenguaje formal de ingeniería, incluye puntos de seguridad y pasos numerados.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        res.json({ content: response.text });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OTRAS RUTAS ---
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
