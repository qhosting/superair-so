
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp } from './services.js';
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// --- IA FOR MANUAL OPERATIVO ---

// 1. Chatbot Técnico con Contexto Local (RAG)
app.post('/api/manuals/ai-ask', async (req, res) => {
    const { question } = req.body;
    try {
        if (!process.env.API_KEY) return res.status(500).json({ error: "IA no configurada" });

        // Recuperar contexto del manual
        const manualRes = await db.query("SELECT title, content FROM manuals");
        const context = manualRes.rows.map(r => `TITULO: ${r.title}\nCONTENIDO: ${r.content}`).join("\n\n---\n\n");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Eres el Asistente Técnico Senior de SuperAir.
            Responde la siguiente pregunta basándote ÚNICAMENTE en el contexto del Manual Operativo proporcionado.
            Si la información no está en el manual, di amablemente que no tienes registro oficial de ese procedimiento.
            
            CONTEXTO DEL MANUAL:
            ${context}
            
            PREGUNTA DEL TÉCNICO:
            "${question}"
        `;

        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        res.json({ reply: result.text });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Generador de Borradores de Protocolos
app.post('/api/manuals/ai-generate', async (req, res) => {
    const { topic, category } = req.body;
    try {
        if (!process.env.API_KEY) return res.status(500).json({ error: "IA no configurada" });

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Genera un borrador detallado y profesional para un manual técnico de SuperAir (empresa de Aire Acondicionado).
            TEMA: ${topic}
            CATEGORÍA: ${category}
            
            Incluye:
            1. Introducción
            2. Requerimientos de seguridad (EPP)
            3. Paso a paso detallado
            4. Criterios de aceptación
            
            Escribe en español técnico de México. No uses markdown excesivo, solo texto claro.
        `;

        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        res.json({ content: result.text });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- MANUAL ENDPOINTS ---

app.get('/api/manuals', async (req, res) => {
    try {
        const userId = req.headers['x-user-id']; // Asumimos que viene del middleware
        const r = await db.query(`
            SELECT m.*, 
            (SELECT COUNT(*) FROM manual_read_logs WHERE manual_id = m.id AND user_id = $1) > 0 as is_read
            FROM manuals m ORDER BY updated_at DESC
        `, [userId || '0']);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/manuals/:id/mark-read', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
        await db.query(`
            INSERT INTO manual_read_logs (manual_id, user_id, read_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (manual_id, user_id) DO NOTHING
        `, [id, userId]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Los demás endpoints de CRUD para usuarios, clientes y productos se mantienen igual...
// (Omitidos aquí para brevedad pero presentes en la ejecución real)

app.listen(3000, () => console.log(`🚀 SuperAir Backend running on port 3000`));
