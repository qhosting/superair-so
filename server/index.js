
import express from 'express';
import * as db from './db.js';
import multer from 'multer';

const app = express();
app.use(express.json());

// --- INICIALIZACIÓN ---
db.initDatabase();

// --- ENDPOINTS PÚBLICOS (SETTINGS) ---
app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings WHERE category IN ('general_info', 'quote_design')");
        const settings = {};
        result.rows.forEach(row => settings[row.category] = row.data);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE LEADS ---
app.get('/api/leads', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM leads ORDER BY created_at DESC");
        res.json(result.rows.map(r => ({ ...r, createdAt: r.created_at, updatedAt: r.updated_at })));
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

app.put('/api/leads/:id', async (req, res) => {
    const { status, history, notes } = req.body;
    try {
        const result = await db.query(
            "UPDATE leads SET status = COALESCE($1, status), history = COALESCE($2, history), notes = COALESCE($3, notes), updated_at = NOW() WHERE id = $4 RETURNING *",
            [status, JSON.stringify(history), notes, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE COTIZACIONES ---
app.get('/api/quotes', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM quotes ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quotes', async (req, res) => {
    const { client_id, client_name, total, status, payment_terms, items } = req.body;
    const token = Math.random().toString(36).substring(2, 15);
    try {
        const result = await db.query(
            "INSERT INTO quotes (client_id, client_name, total, status, payment_terms, items, public_token) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [client_id, client_name, total, status || 'Borrador', payment_terms, JSON.stringify(items), token]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE CITAS (APPOINTMENTS) ---
app.get('/api/appointments', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, c.name as client_name 
            FROM appointments a 
            LEFT JOIN clients c ON a.client_id = c.id 
            ORDER BY date ASC, time ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', async (req, res) => {
    const { client_id, technician, date, time, duration, type, status } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO appointments (client_id, technician, date, time, duration, type, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [client_id, technician, date, time, duration, type, status || 'Programada']
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', async (req, res) => {
    const { status } = req.body;
    try {
        const result = await db.query(
            "UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *",
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE MANUALES (KNOWLEDGE BASE) ---
app.get('/api/manuals', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM manual_articles ORDER BY category, title");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ENDPOINTS DE NOTIFICACIONES ---
app.get('/api/notifications', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifications/mark-read', async (req, res) => {
    try {
        await db.query("UPDATE notifications SET is_read = TRUE");
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- BÓVEDA FISCAL ---
app.get('/api/fiscal/inbox', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM fiscal_inbox WHERE status = 'Unlinked' ORDER BY created_at DESC");
        res.json(result.rows.map(r => ({
            uuid: r.uuid,
            rfc: r.rfc_emitter,
            legalName: r.legal_name,
            amount: r.amount,
            date: r.created_at
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SETTINGS, CLIENTS, PRODUCTS, WAREHOUSES ---
app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings");
        const settings = {};
        result.rows.forEach(row => settings[row.category] = row.data);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    const { category, data } = req.body;
    try {
        await db.query("INSERT INTO app_settings (category, data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET data = $2", [category, data]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/warehouses', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT w.*, u.name as responsible_name 
            FROM warehouses w 
            LEFT JOIN users u ON w.responsible_id = u.id 
            ORDER BY w.name ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'active', db: 'connected' }));

app.listen(3000, () => console.log(`🚀 SuperAir ERP Backend Online on Port 3000`));
