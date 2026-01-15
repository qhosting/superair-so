
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';
import redis from './redis.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import multer from 'multer';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { google } from 'googleapis';
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { sendWhatsApp, sendChatwootMessage, analyzeLeadIntent } from './services.js';

// --- CONFIG & HANDLERS ---
process.on('uncaughtException', (err) => console.error('❌ CRITICAL ERROR (Uncaught):', err));
process.on('unhandledRejection', (reason, promise) => console.error('❌ CRITICAL REJECTION (Unhandled):', reason));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_change_in_prod';

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date(), db: 'connected' }));

const authenticateToken = (req, res, next) => {
  const publicPaths = ['/api/auth/login', '/api/health', '/api/cms/content', '/api/settings/public', '/api/leads'];
  const currentPath = req.originalUrl.split('?')[0];
  if (req.method === 'GET' && (currentPath.startsWith('/uploads') || publicPaths.includes(currentPath))) return next();
  if (publicPaths.includes(currentPath)) return next();
  if (currentPath === '/api/leads' && req.method === 'POST') return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sesión no iniciada.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Su sesión ha expirado.' });
    req.user = user;
    next();
  });
};

app.use('/api', authenticateToken);

const initDB = async () => {
  try {
    console.log("🛠️ Inicializando Tablas Multi-Inventario y Compras...");
    
    // Base Tables
    await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'Admin', status TEXT DEFAULT 'Activo', last_login TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, rfc TEXT, type TEXT DEFAULT 'Residencial', status TEXT DEFAULT 'Prospecto', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, code TEXT, name TEXT NOT NULL, description TEXT, price NUMERIC, category TEXT, min_stock INTEGER DEFAULT 5, cost NUMERIC DEFAULT 0, type TEXT DEFAULT 'product', requires_serial BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // Multi-Inventory & Procurement
    await db.query(`CREATE TABLE IF NOT EXISTS vendors (id SERIAL PRIMARY KEY, name TEXT NOT NULL, rfc TEXT, contact_name TEXT, phone TEXT, email TEXT, address TEXT, credit_days INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS warehouses (id SERIAL PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'Central', responsible_id INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_levels (product_id INTEGER REFERENCES products(id), warehouse_id INTEGER REFERENCES warehouses(id), stock INTEGER DEFAULT 0, PRIMARY KEY (product_id, warehouse_id))`);
    await db.query(`CREATE TABLE IF NOT EXISTS serial_numbers (serial TEXT PRIMARY KEY, product_id INTEGER REFERENCES products(id), warehouse_id INTEGER REFERENCES warehouses(id), status TEXT DEFAULT 'Disponible', last_movement_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS purchases (id SERIAL PRIMARY KEY, vendor_id INTEGER REFERENCES vendors(id), warehouse_id INTEGER DEFAULT 1, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_movements (id SERIAL PRIMARY KEY, product_id INTEGER REFERENCES products(id), warehouse_id INTEGER, user_id INTEGER REFERENCES users(id), type TEXT, quantity INTEGER, reason TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // Standard Modules
    await db.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), client_name TEXT, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, payment_terms TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, quote_id INTEGER REFERENCES quotes(id), client_name TEXT, total NUMERIC, paid_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'Pendiente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // Default Almacen Central
    await db.query("INSERT INTO warehouses (name, type) SELECT 'Bodega Central', 'Central' WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE name = 'Bodega Central')");

    console.log('✅ Base de datos SuperAir lista.');
  } catch (err) { console.error('❌ DB INIT ERROR:', err.message); }
};

db.checkConnection().then(connected => { if(connected) initDB(); });

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
      } else res.status(401).json({ error: 'Pass incorrecta' });
    } else res.status(401).json({ error: 'No existe usuario' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// --- PRODUCTS & INVENTORY ---
app.get('/api/products', async (req, res) => {
    const warehouse_id = req.query.warehouse_id;
    let r;
    if (warehouse_id && warehouse_id !== 'all') {
        r = await db.query(`
            SELECT p.*, COALESCE(l.stock, 0) as stock 
            FROM products p 
            LEFT JOIN inventory_levels l ON p.id = l.product_id AND l.warehouse_id = $1 
            ORDER BY p.name ASC
        `, [warehouse_id]);
    } else {
        r = await db.query(`
            SELECT p.*, (SELECT SUM(stock) FROM inventory_levels WHERE product_id = p.id) as stock 
            FROM products p ORDER BY name ASC
        `);
    }
    res.json(r.rows);
});

app.get('/api/inventory/serials/:product_id', async (req, res) => {
    const { product_id } = req.params;
    const r = await db.query(`
        SELECT s.*, w.name as warehouse_name 
        FROM serial_numbers s 
        JOIN warehouses w ON s.warehouse_id = w.id 
        WHERE s.product_id = $1 AND s.status = 'Disponible'
    `, [product_id]);
    res.json(r.rows);
});

// --- PURCHASES (ENHANCED) ---
app.get('/api/purchases', async (req, res) => {
    const r = await db.query(`
        SELECT p.*, v.name as vendor_name, v.rfc as vendor_rfc, w.name as warehouse_name 
        FROM purchases p 
        LEFT JOIN vendors v ON p.vendor_id = v.id 
        LEFT JOIN warehouses w ON p.warehouse_id = w.id
        ORDER BY p.created_at DESC
    `);
    res.json(r.rows);
});

app.post('/api/purchases', async (req, res) => {
    const { vendor_id, warehouse_id, total, items, status } = req.body;
    try {
        const result = await db.query('INSERT INTO purchases (vendor_id, warehouse_id, total, items, status) VALUES ($1,$2,$3,$4,$5) RETURNING id', [vendor_id, warehouse_id || 1, total, JSON.stringify(items), status]);
        const purchaseId = result.rows[0].id;

        if (status === 'Recibido') {
            for (const item of items) {
                // Actualizar Niveles de Stock
                await db.query('INSERT INTO inventory_levels (product_id, warehouse_id, stock) VALUES ($1, $2, $3) ON CONFLICT (product_id, warehouse_id) DO UPDATE SET stock = inventory_levels.stock + $3', [item.product_id, warehouse_id || 1, item.quantity]);
                
                // Actualizar Costo Maestro
                await db.query('UPDATE products SET cost = $1 WHERE id = $2', [item.cost, item.product_id]);
                
                // Log Movimiento
                await db.query('INSERT INTO inventory_movements (product_id, warehouse_id, user_id, type, quantity, reason) VALUES ($1, $2, $3, $4, $5, $6)', [item.product_id, warehouse_id || 1, req.user.id, 'Entrada', item.quantity, `Compra Recibida Folio #${purchaseId}`]);
                
                // Registrar Seriales si existen
                if (item.serials && Array.isArray(item.serials)) {
                    for (const s of item.serials) {
                        await db.query('INSERT INTO serial_numbers (serial, product_id, warehouse_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (serial) DO UPDATE SET status = $4, warehouse_id = $3', [s, item.product_id, warehouse_id || 1, 'Disponible']);
                    }
                }
            }
        }
        res.json({ success: true, id: purchaseId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OTHER ENDPOINTS (Standard) ---
app.get('/api/vendors', async (req, res) => {
    const r = await db.query('SELECT * FROM vendors ORDER BY name ASC');
    res.json(r.rows);
});

app.get('/api/warehouses', async (req, res) => {
    const r = await db.query('SELECT w.*, u.name as responsible_name FROM warehouses w LEFT JOIN users u ON w.responsible_id = u.id');
    res.json(r.rows);
});

app.listen(PORT, HOST, () => console.log(`🚀 SUPERAIR Server running on http://${HOST}:${PORT}`));
