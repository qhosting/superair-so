
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp } from './services.js';

const app = express();
app.use(express.json());

// --- ENDPOINTS BASE (CRUD) ---

// Usuarios
app.get('/api/users', async (req, res) => {
    try {
        const r = await db.query("SELECT id, name, email, role, status, last_login as \"lastLogin\" FROM users ORDER BY name ASC");
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Clientes
app.get('/api/clients', async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM clients ORDER BY name ASC");
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/360', async (req, res) => {
    const { id } = req.params;
    try {
        const client = await db.query("SELECT * FROM clients WHERE id = $1", [id]);
        const assets = await db.query("SELECT * FROM client_assets WHERE client_id = $1", [id]);
        const appointments = await db.query("SELECT * FROM appointments WHERE client_id = $1 ORDER BY date DESC", [id]);
        const quotes = await db.query("SELECT * FROM quotes WHERE client_id = $1 ORDER BY created_at DESC", [id]);
        
        res.json({
            client: client.rows[0] || null,
            assets: assets.rows || [],
            appointments: appointments.rows || [],
            quotes: quotes.rows || []
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Productos e Inventario
app.get('/api/products', async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM products ORDER BY name ASC");
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/warehouses', async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM warehouses ORDER BY name ASC");
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Citas y Calendario
app.get('/api/appointments', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT a.*, c.name as client_name 
            FROM appointments a 
            LEFT JOIN clients c ON a.client_id = c.id 
            ORDER BY a.date ASC, a.time ASC
        `);
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', async (req, res) => {
    const { client_id, technician, date, time, duration, type, status } = req.body;
    try {
        const r = await db.query(`
            INSERT INTO appointments (client_id, technician, date, time, duration, type, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [client_id, technician, date, time, duration, type, status]);
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const r = await db.query("UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Leads / Pipeline
app.get('/api/leads', async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM leads ORDER BY created_at DESC");
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cotizaciones
app.get('/api/quotes', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT q.*, c.name as client_name 
            FROM quotes q 
            JOIN clients c ON q.client_id = c.id 
            ORDER BY q.created_at DESC
        `);
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INVENTARIO AVANZADO & TRASPASOS ---

app.get('/api/inventory/kits', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT k.*, 
                   (SELECT json_agg(json_build_object('product_id', ki.product_id, 'quantity', ki.quantity, 'product_name', p.name))
                    FROM inventory_kit_items ki 
                    JOIN products p ON p.id = ki.product_id
                    WHERE ki.kit_id = k.id) as items
            FROM inventory_kits k
        `);
        res.json(r.rows || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/valuation', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT 
                COALESCE(SUM(stock * cost), 0) as total_valuation,
                COALESCE(SUM(CASE WHEN stock < min_stock THEN 1 ELSE 0 END), 0) as critical_items,
                category,
                SUM(stock * cost) as category_value
            FROM products 
            GROUP BY category
        `);
        
        const summary = {
            total: r.rows.reduce((acc, curr) => acc + Number(curr.category_value), 0),
            critical: r.rows[0]?.critical_items || 0,
            breakdown: r.rows.map(row => ({ name: row.category, value: Number(row.category_value) }))
        };
        res.json(summary);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- MÓDULO VENTAS & ÓRDENES ---

app.get('/api/orders', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT o.*, c.name as "clientName", c.phone as "clientPhone"
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            ORDER BY o.created_at DESC
        `);
        const enrichedOrders = r.rows.map(order => {
            const created = new Date(order.created_at);
            let days = order.payment_terms?.includes('30') ? 30 : 0;
            const dueDate = new Date(created);
            dueDate.setDate(created.getDate() + days);
            const isOverdue = new Date() > dueDate && Number(order.paid_amount) < Number(order.total);
            const profit = Number(order.total) - Number(order.cost_total);
            return {
                ...order,
                paidAmount: Number(order.paid_amount),
                dueDate: dueDate.toISOString(),
                isOverdue,
                profitMargin: order.total > 0 ? (profit / Number(order.total)) * 100 : 0,
                commission: profit * 0.10
            };
        });
        res.json(enrichedOrders || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Configuración Pública
app.get('/api/settings/public', async (req, res) => {
    try {
        const r = await db.query("SELECT data FROM app_settings WHERE category = 'general_info'");
        res.json(r.rows[0]?.data || { companyName: 'SuperAir', isMaintenance: false });
    } catch (e) { res.json({ companyName: 'SuperAir', isMaintenance: false }); }
});

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SuperAir Backend running on port ${PORT}`));
