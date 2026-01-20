
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

// --- PRODUCTS CRUD ---
app.get('/api/products', async (req, res) => {
    const { warehouse_id } = req.query;
    try {
        let result;
        if (warehouse_id && warehouse_id !== 'all') {
            // En una implementación real, aquí uniríamos con una tabla de stock por almacén.
            // Para este MVP, devolvemos el stock global.
            result = await db.query("SELECT * FROM products ORDER BY name ASC");
        } else {
            result = await db.query("SELECT * FROM products ORDER BY name ASC");
        }
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
    const { code, name, price, cost, stock, min_stock, category, unit_of_measure } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO products (code, name, price, cost, stock, min_stock, category, unit_of_measure) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [code, name, price, cost, stock || 0, min_stock || 5, category, unit_of_measure || 'Pza']
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { code, name, price, cost, stock, min_stock, category, unit_of_measure } = req.body;
    try {
        const result = await db.query(
            "UPDATE products SET code=$1, name=$2, price=$3, cost=$4, stock=$5, min_stock=$6, category=$7, unit_of_measure=$8 WHERE id=$9 RETURNING *",
            [code, name, price, cost, stock, min_stock, category, unit_of_measure, id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM products WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products/bulk', async (req, res) => {
    const { products } = req.body;
    try {
        for (const p of products) {
            await db.query(
                "INSERT INTO products (code, name, price, cost, stock, min_stock, category) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO UPDATE SET name=$2, price=$3, cost=$4, stock=$5, min_stock=$6, category=$7",
                [p.code, p.name, p.price, p.cost, p.stock, p.min_stock || 5, p.category]
            );
        }
        res.json({ success: true, count: products.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/adjust', async (req, res) => {
    const { productId, newStock, reason } = req.body;
    try {
        await db.query("UPDATE products SET stock = $1 WHERE id = $2", [newStock, productId]);
        // Aquí se podría insertar en una tabla de 'inventory_logs'
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- REST OF ENDPOINTS (QUOTES, ORDERS, VENDORS, ETC) ---
// ... (mantenemos los endpoints existentes de ventas y compras)

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
