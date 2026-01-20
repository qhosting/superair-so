
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

// --- VENDORS ---
app.get('/api/vendors', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM vendors ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendors', async (req, res) => {
    const { name, rfc, email, phone, credit_days } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO vendors (name, rfc, email, phone, credit_days) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, rfc, email, phone, credit_days || 0]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PURCHASES ---
app.get('/api/purchases', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, v.name as vendor_name, w.name as warehouse_name 
            FROM purchases p 
            LEFT JOIN vendors v ON p.vendor_id = v.id 
            LEFT JOIN warehouses w ON p.warehouse_id = w.id 
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases', async (req, res) => {
    const { vendor_id, warehouse_id, total, items, fiscal_uuid } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO purchases (vendor_id, warehouse_id, total, items, fiscal_uuid, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [vendor_id, warehouse_id, total, JSON.stringify(items), fiscal_uuid, 'Borrador']
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases/:id/receive', async (req, res) => {
    const { id } = req.params;
    try {
        const purchaseRes = await db.query("SELECT * FROM purchases WHERE id = $1", [id]);
        const purchase = purchaseRes.rows[0];
        
        if (!purchase || purchase.status === 'Recibido') {
            return res.status(400).json({ error: "Orden ya recibida o no encontrada" });
        }

        const items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items;

        // Actualizar stock de cada producto
        for (const item of items) {
            await db.query(
                "UPDATE products SET stock = stock + $1, cost = $2 WHERE id = $3",
                [item.quantity, item.cost, item.product_id]
            );
        }

        await db.query("UPDATE purchases SET status = 'Recibido' WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AI SUGGESTIONS FOR PURCHASES ---
app.get('/api/purchases/ai-suggest', async (req, res) => {
    try {
        const productsRes = await db.query("SELECT id, name, stock, min_stock FROM products WHERE stock < min_stock");
        const criticalItems = productsRes.rows;

        if (criticalItems.length === 0) {
            return res.json({ suggested_items: [] });
        }

        const context = criticalItems.map(p => `${p.name} (Stock: ${p.stock}, Min: ${p.min_stock})`).join(', ');
        const prompt = `Actúa como un Jefe de Compras HVAC. Tenemos los siguientes productos con stock crítico (por debajo del mínimo): ${context}. 
                       Sugiere cantidades a comprar para cada uno para cubrir al menos 2 meses de operación. 
                       Responde estrictamente en JSON con este formato: {"suggested_items": [{"product_id": number, "quantity": number}]}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        res.json(JSON.parse(response.text));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- FISCAL INBOX ---
app.get('/api/fiscal/inbox', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM fiscal_inbox WHERE status = 'Unlinked' ORDER BY created_at DESC");
        res.json(result.rows.map(r => ({ ...r, legalName: r.legal_name })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- REST OF ENDPOINTS (CLIENTS, QUOTES, ETC) ---
app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT category, data FROM app_settings WHERE category IN ('general_info', 'quote_design')");
        const settings = {};
        result.rows.forEach(row => settings[row.category] = row.data);
        res.json(settings);
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
        const result = await db.query("SELECT w.*, u.name as responsible_name FROM warehouses w LEFT JOIN users u ON w.responsible_id = u.id ORDER BY w.id ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, role, status FROM users");
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
