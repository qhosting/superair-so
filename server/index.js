
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

// --- WAREHOUSES & LOGISTICS ---
app.get('/api/warehouses', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT w.*, u.name as responsible_name 
            FROM warehouses w 
            LEFT JOIN users u ON w.responsible_id = u.id 
            ORDER BY w.type DESC, w.name ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/warehouses', async (req, res) => {
    const { name, responsible_id, type } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO warehouses (name, responsible_id, type) VALUES ($1, $2, $3) RETURNING *",
            [name, responsible_id, type || 'Unidad Móvil']
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener niveles de stock específicos de un almacén
app.get('/api/inventory/levels/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT p.id, p.name, p.code, p.unit_of_measure, COALESCE(wi.stock, 0) as stock
            FROM products p
            LEFT JOIN warehouse_inventory wi ON p.id = wi.product_id AND wi.warehouse_id = $1
            ORDER BY p.name ASC
        `, [id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Traspaso de material (Carga de Unidad)
app.post('/api/inventory/transfer', async (req, res) => {
    const { from, to, items } = req.body;
    try {
        await db.query("BEGIN");

        // Registrar el traspaso como pendiente
        const transferRes = await db.query(
            "INSERT INTO inventory_transfers (from_warehouse_id, to_warehouse_id, items, status) VALUES ($1, $2, $3, $4) RETURNING id",
            [from, to, JSON.stringify(items), 'Pendiente']
        );

        // Restar stock del origen inmediatamente
        for (const item of items) {
            await db.query(`
                INSERT INTO warehouse_inventory (warehouse_id, product_id, stock) 
                VALUES ($1, $2, -$3)
                ON CONFLICT (warehouse_id, product_id) 
                DO UPDATE SET stock = warehouse_inventory.stock - $3
            `, [from, item.product_id, item.quantity]);
        }

        await db.query("COMMIT");
        res.json({ success: true, transfer_id: transferRes.rows[0].id });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

// Confirmar recepción de traspaso (El técnico acepta la carga)
app.post('/api/inventory/transfers/:id/confirm', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("BEGIN");

        const transferRes = await db.query("SELECT * FROM inventory_transfers WHERE id = $1", [id]);
        const transfer = transferRes.rows[0];

        if (!transfer || transfer.status !== 'Pendiente') {
            throw new Error("Traspaso no encontrado o ya procesado");
        }

        const items = typeof transfer.items === 'string' ? JSON.parse(transfer.items) : transfer.items;

        // Sumar stock al destino
        for (const item of items) {
            await db.query(`
                INSERT INTO warehouse_inventory (warehouse_id, product_id, stock) 
                VALUES ($1, $2, $3)
                ON CONFLICT (warehouse_id, product_id) 
                DO UPDATE SET stock = warehouse_inventory.stock + $3
            `, [transfer.to_warehouse_id, item.product_id, item.quantity]);
        }

        await db.query("UPDATE inventory_transfers SET status = 'Completado' WHERE id = $1", [id]);

        await db.query("COMMIT");
        res.json({ success: true });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

// Obtener traspasos pendientes para un almacén (Notificaciones para técnicos)
app.get('/api/inventory/transfers/pending/:warehouse_id', async (req, res) => {
    const { warehouse_id } = req.params;
    try {
        const result = await db.query(`
            SELECT t.*, w.name as from_name 
            FROM inventory_transfers t
            JOIN warehouses w ON t.from_warehouse_id = w.id
            WHERE t.to_warehouse_id = $1 AND t.status = 'Pendiente'
        `, [warehouse_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Gestión de KITS
app.get('/api/inventory/kits', async (req, res) => {
    try {
        const kitsRes = await db.query("SELECT * FROM inventory_kits ORDER BY name ASC");
        const kits = kitsRes.rows;
        for (const kit of kits) {
            const itemsRes = await db.query(`
                SELECT ki.*, p.name as product_name 
                FROM inventory_kit_items ki 
                JOIN products p ON ki.product_id = p.id 
                WHERE ki.kit_id = $1
            `, [kit.id]);
            kit.items = itemsRes.rows;
        }
        res.json(kits);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/kits', async (req, res) => {
    const { name, description, items } = req.body;
    try {
        await db.query("BEGIN");
        const kitRes = await db.query("INSERT INTO inventory_kits (name, description) VALUES ($1, $2) RETURNING id", [name, description]);
        const kitId = kitRes.rows[0].id;

        if (items && items.length > 0) {
            for (const item of items) {
                await db.query("INSERT INTO inventory_kit_items (kit_id, product_id, quantity) VALUES ($1, $2, $3)", [kitId, item.product_id, item.quantity]);
            }
        }
        await db.query("COMMIT");
        res.json({ success: true, id: kitId });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

// --- OTRAS RUTAS ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM products ORDER BY name ASC");
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
