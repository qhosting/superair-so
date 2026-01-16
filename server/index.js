
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

// --- ENDPOINTS DE TRASPASOS (LOGÍSTICA) ---
app.get('/api/inventory/transfers/pending/:warehouse_id', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.*, w.name as from_name 
            FROM inventory_transfers t
            JOIN warehouses w ON t.from_warehouse_id = w.id
            WHERE t.to_warehouse_id = $1 AND t.status = 'Pendiente'
        `, [req.params.warehouse_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/transfer', async (req, res) => {
    const { from, to, items } = req.body;
    try {
        await db.query(`
            INSERT INTO inventory_transfers (from_warehouse_id, to_warehouse_id, items)
            VALUES ($1, $2, $3)
        `, [from, to, JSON.stringify(items)]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/transfers/:id/confirm', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const transfer = await client.query("SELECT * FROM inventory_transfers WHERE id = $1", [req.params.id]);
        const { from_warehouse_id, to_warehouse_id, items } = transfer.rows[0];

        for (const item of items) {
            // Descontar del origen
            await client.query(`
                INSERT INTO inventory_levels (warehouse_id, product_id, stock) VALUES ($1, $2, -$3)
                ON CONFLICT (warehouse_id, product_id) DO UPDATE SET stock = inventory_levels.stock - $3
            `, [from_warehouse_id, item.product_id, item.quantity]);
            
            // Sumar al destino
            await client.query(`
                INSERT INTO inventory_levels (warehouse_id, product_id, stock) VALUES ($1, $2, $3)
                ON CONFLICT (warehouse_id, product_id) DO UPDATE SET stock = inventory_levels.stock + $3
            `, [to_warehouse_id, item.product_id, item.quantity]);
        }

        await client.query("UPDATE inventory_transfers SET status = 'Completado', completed_at = NOW() WHERE id = $1", [req.params.id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
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

// --- RESTO DE ENDPOINTS EXISTENTES (SETTINGS, CLIENTS, ETC) ---
app.get('/api/settings', async (req, res) => {
    const result = await db.query("SELECT category, data FROM app_settings");
    const settings = {};
    result.rows.forEach(row => settings[row.category] = row.data);
    res.json(settings);
});

app.post('/api/settings', async (req, res) => {
    const { category, data } = req.body;
    await db.query("INSERT INTO app_settings (category, data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET data = $2", [category, data]);
    res.json({ success: true });
});

app.get('/api/clients', async (req, res) => {
    const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
    res.json(result.rows);
});

app.get('/api/products', async (req, res) => {
    const result = await db.query("SELECT * FROM products ORDER BY name ASC");
    res.json(result.rows);
});

app.get('/api/warehouses', async (req, res) => {
    const result = await db.query(`
        SELECT w.*, u.name as responsible_name 
        FROM warehouses w 
        LEFT JOIN users u ON w.responsible_id = u.id 
        ORDER BY w.name ASC
    `);
    res.json(result.rows);
});

app.get('/api/inventory/levels/:id', async (req, res) => {
    const result = await db.query(`
        SELECT p.id, p.name, p.code, p.unit_of_measure, l.stock 
        FROM inventory_levels l
        JOIN products p ON l.product_id = p.id
        WHERE l.warehouse_id = $1
    `, [req.params.id]);
    res.json(result.rows);
});

app.get('/api/health', (req, res) => res.json({ status: 'active', db: 'connected' }));

app.listen(3000, () => console.log(`🚀 SuperAir Data Integrity Layer Online`));
