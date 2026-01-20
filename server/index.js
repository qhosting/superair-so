
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

// --- INICIALIZACIÓN DE DB ---
db.initDatabase();

// --- APPOINTMENTS (AGENDA Y CAMPO) ---
app.get('/api/appointments', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone, c.address as client_address
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            ORDER BY a.date ASC, a.time ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', async (req, res) => {
    const { client_id, technician, date, time, duration, type, notes } = req.body;
    try {
        // 1. Validar traslape de horario para el mismo técnico
        const conflictRes = await db.query(
            "SELECT id FROM appointments WHERE technician = $1 AND date = $2 AND time = $3 AND status != 'Cancelada'",
            [technician, date, time]
        );
        
        if (conflictRes.rows.length > 0) {
            return res.status(400).json({ error: "El técnico ya tiene una cita asignada en ese horario." });
        }

        const result = await db.query(
            `INSERT INTO appointments (client_id, technician, date, time, duration, type, notes, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Programada') RETURNING *`,
            [client_id, technician, date, time, duration || 60, type, notes]
        );
        
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const { status, actual_duration } = req.body;
    try {
        const aptRes = await db.query(
            "UPDATE appointments SET status = $1, actual_duration = COALESCE($2, actual_duration) WHERE id = $3 RETURNING *",
            [status, actual_duration, id]
        );
        const apt = aptRes.rows[0];

        // 2. Disparar notificaciones inteligentes vía WhatsApp
        const clientRes = await db.query("SELECT name, phone FROM clients WHERE id = $1", [apt.client_id]);
        const client = clientRes.rows[0];

        if (client && client.phone) {
            let msg = "";
            if (status === 'En Proceso') {
                msg = `Hola ${client.name}, el técnico de SuperAir va en camino a tu domicilio para el servicio de ${apt.type}. ¡Nos vemos pronto!`;
            } else if (status === 'Completada') {
                msg = `¡Servicio Concluido! ${client.name}, tu ${apt.type} ha sido finalizado con éxito. Gracias por confiar en SuperAir.`;
            }

            if (msg) {
                try { await services.sendWhatsApp(client.phone, msg); } 
                catch (err) { console.error("Error enviando notificación WhatsApp:", err.message); }
            }
        }

        res.json(apt);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CLIENTS & AUTH ---
app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, role, status FROM users");
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
