
import express from 'express';
import * as db from './db.js';
import multer from 'multer';
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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'AIzaSyAeHjI__WWaBp17nZLm4AaalYYXs_RDyzs' });

// --- QUOTES & ACCEPTANCE ---
app.post('/api/quotes/public/:token/accept', async (req, res) => {
    const { token } = req.params;
    try {
        // 1. Marcar cotización como aceptada
        const quoteRes = await db.query("UPDATE quotes SET status = 'Aceptada' WHERE public_token = $1 RETURNING *", [token]);
        const quote = quoteRes.rows[0];
        if (!quote) return res.status(404).json({ error: "Quote not found" });

        // 2. Crear la Orden de Venta automáticamente
        const items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;
        const costTotal = items.reduce((acc, i) => acc + (i.quantity * (i.cost || 0)), 0);
        const margin = quote.total > 0 ? ((quote.total - (costTotal * 1.16)) / quote.total) * 100 : 0;
        
        // Fecha vencimiento +15 días por defecto
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        await db.query(
            `INSERT INTO orders (quote_id, client_id, client_name, total, cost_total, status, payment_terms, due_date, profit_margin) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [quote.id, quote.client_id, quote.client_name, quote.total, costTotal, 'Pendiente', quote.payment_terms, dueDate, margin]
        );

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SALES / ORDERS ---
app.get('/api/orders', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT *, 
            (due_date < CURRENT_DATE AND status != 'Completado') as is_overdue,
            (total - paid_amount) as balance
            FROM orders 
            ORDER BY created_at DESC
        `);
        res.json(result.rows.map(r => ({
            ...r,
            clientName: r.client_name,
            paidAmount: r.paid_amount,
            costTotal: r.cost_total,
            dueDate: r.due_date,
            profitMargin: parseFloat(r.profit_margin),
            isOverdue: r.is_overdue,
            paymentTerms: r.payment_terms,
            evidenceUrl: r.evidence_url
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders/pay', async (req, res) => {
    const { orderId, amount, method } = req.body;
    try {
        await db.query("BEGIN");
        
        // Registrar el pago
        await db.query(
            "INSERT INTO order_payments (order_id, amount, method) VALUES ($1, $2, $3)",
            [orderId, amount, method]
        );

        // Actualizar monto pagado en la orden
        const updateRes = await db.query(
            "UPDATE orders SET paid_amount = paid_amount + $1 WHERE id = $2 RETURNING *",
            [amount, orderId]
        );
        
        const order = updateRes.rows[0];
        let newStatus = order.status;
        if (order.paid_amount >= order.total) newStatus = 'Completado';
        else if (order.paid_amount > 0) newStatus = 'Parcial';

        await db.query("UPDATE orders SET status = $1 WHERE id = $2", [newStatus, orderId]);
        
        // Actualizar LTV del cliente
        await db.query("UPDATE clients SET ltv = ltv + $1 WHERE id = $2", [amount, order.client_id]);

        await db.query("COMMIT");
        res.json({ success: true });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/orders/:id/close-technical', async (req, res) => {
    const { id } = req.params;
    const { evidenceUrl } = req.body;
    try {
        await db.query("UPDATE orders SET evidence_url = $1 WHERE id = $2", [evidenceUrl, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- REST OF ENDPOINTS ---
app.get('/api/quotes', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM quotes ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM clients ORDER BY name ASC");
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
