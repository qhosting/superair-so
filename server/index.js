
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

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const publicPaths = ['/api/auth/login', '/api/health', '/api/cms/content', '/api/settings/public', '/api/leads'];
  const currentPath = req.originalUrl.split('?')[0];
  if (publicPaths.includes(currentPath)) return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired' });
    req.user = user;
    next();
  });
};

app.use('/api', authenticateToken);

// --- INITIALIZE FULL INDUSTRIAL SCHEMA ---
const initDB = async () => {
  try {
    console.log("🛠️ Sincronizando Esquema SuperAir v1.0...");
    
    // Core
    await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'Admin', status TEXT DEFAULT 'Activo', last_login TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, rfc TEXT, type TEXT DEFAULT 'Residencial', status TEXT DEFAULT 'Prospecto', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, code TEXT, name TEXT NOT NULL, description TEXT, price NUMERIC, cost NUMERIC DEFAULT 0, category TEXT, min_stock INTEGER DEFAULT 5, type TEXT DEFAULT 'product', requires_serial BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // Inventory & Logistics
    await db.query(`CREATE TABLE IF NOT EXISTS vendors (id SERIAL PRIMARY KEY, name TEXT NOT NULL, rfc TEXT, contact_name TEXT, phone TEXT, email TEXT, address TEXT, credit_days INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS warehouses (id SERIAL PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'Central', responsible_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_levels (product_id INTEGER REFERENCES products(id), warehouse_id INTEGER REFERENCES warehouses(id), stock INTEGER DEFAULT 0, PRIMARY KEY (product_id, warehouse_id))`);
    await db.query(`CREATE TABLE IF NOT EXISTS serial_numbers (serial TEXT PRIMARY KEY, product_id INTEGER REFERENCES products(id), warehouse_id INTEGER REFERENCES warehouses(id), status TEXT DEFAULT 'Disponible', last_movement_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_movements (id SERIAL PRIMARY KEY, product_id INTEGER, warehouse_id INTEGER, user_id INTEGER, type TEXT, quantity INTEGER, reason TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_transfers (id SERIAL PRIMARY KEY, from_warehouse_id INTEGER, to_warehouse_id INTEGER, items JSONB, status TEXT DEFAULT 'Completado', user_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // Sales & Finance
    await db.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, client_id INTEGER, client_name TEXT, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, payment_terms TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, quote_id INTEGER, client_name TEXT, total NUMERIC, paid_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'Pendiente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS purchases (id SERIAL PRIMARY KEY, vendor_id INTEGER, warehouse_id INTEGER, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS fiscal_inbox (uuid TEXT PRIMARY KEY, rfc_emitter TEXT, legal_name TEXT, amount NUMERIC, origin_email TEXT, status TEXT DEFAULT 'Unlinked', pdf_url TEXT, issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // CMS & Ops
    await db.query(`CREATE TABLE IF NOT EXISTS app_settings (category TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, source TEXT DEFAULT 'Manual', campaign TEXT, status TEXT DEFAULT 'Nuevo', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS manuals (id SERIAL PRIMARY KEY, category TEXT, title TEXT NOT NULL, content TEXT, tags JSONB, pdf_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, client_id INTEGER, technician TEXT, date DATE, time TIME, duration INTEGER, type TEXT, status TEXT DEFAULT 'Programada')`);

    // Seed Data: Almacén Central
    await db.query("INSERT INTO warehouses (name, type) SELECT 'Bodega Central', 'Central' WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE id = 1)");

    console.log('✅ Base de datos SuperAir lista para producción.');
  } catch (err) { console.error('❌ DB INIT ERROR:', err.message); }
};

db.checkConnection().then(connected => { if(connected) initDB(); });

// --- API ENDPOINTS ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (r.rows.length > 0) {
      const user = r.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
      } else res.status(401).json({ error: 'Invalid password' });
    } else res.status(401).json({ error: 'User not found' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Products & Multi-Inventory
app.get('/api/products', async (req, res) => {
  const whId = req.query.warehouse_id;
  let q;
  if (whId && whId !== 'all') {
    q = await db.query(`
      SELECT p.*, COALESCE(l.stock, 0) as stock 
      FROM products p 
      LEFT JOIN inventory_levels l ON p.id = l.product_id AND l.warehouse_id = $1 
      ORDER BY p.name ASC`, [whId]);
  } else {
    q = await db.query(`
      SELECT p.*, (SELECT SUM(stock) FROM inventory_levels WHERE product_id = p.id) as stock 
      FROM products p ORDER BY name ASC`);
  }
  res.json(q.rows);
});

app.get('/api/inventory/breakdown/:product_id', async (req, res) => {
    const r = await db.query(`
        SELECT w.name as warehouse_name, w.type, COALESCE(l.stock, 0) as stock 
        FROM warehouses w 
        LEFT JOIN inventory_levels l ON w.id = l.warehouse_id AND l.product_id = $1
        ORDER BY w.id ASC`, [req.params.product_id]);
    res.json(r.rows);
});

app.get('/api/inventory/movements/:product_id', async (req, res) => {
    const r = await db.query(`
        SELECT m.*, u.name as user_name FROM inventory_movements m 
        LEFT JOIN users u ON m.user_id = u.id 
        WHERE m.product_id = $1 ORDER BY m.created_at DESC LIMIT 50`, [req.params.product_id]);
    res.json(r.rows);
});

app.get('/api/inventory/serials/:product_id', async (req, res) => {
    const r = await db.query(`
        SELECT s.*, w.name as warehouse_name FROM serial_numbers s 
        JOIN warehouses w ON s.warehouse_id = w.id 
        WHERE s.product_id = $1 AND s.status = 'Disponible'`, [req.params.product_id]);
    res.json(r.rows);
});

// Logistics: Warehouses & Transfers
app.get('/api/warehouses', async (req, res) => {
    const r = await db.query('SELECT w.*, u.name as responsible_name FROM warehouses w LEFT JOIN users u ON w.responsible_id = u.id');
    res.json(r.rows);
});

app.post('/api/warehouses', async (req, res) => {
    const { name, type, responsible_id } = req.body;
    await db.query('INSERT INTO warehouses (name, type, responsible_id) VALUES ($1,$2,$3)', [name, type, responsible_id || null]);
    res.json({ success: true });
});

app.get('/api/inventory/levels/:warehouse_id', async (req, res) => {
    const r = await db.query(`
        SELECT p.id, p.name, p.code, p.category, COALESCE(l.stock, 0) as stock 
        FROM products p 
        LEFT JOIN inventory_levels l ON p.id = l.product_id AND l.warehouse_id = $1
        WHERE p.type = 'product' ORDER BY p.name ASC`, [req.params.warehouse_id]);
    res.json(r.rows);
});

app.post('/api/inventory/transfer', async (req, res) => {
    const { from, to, items } = req.body;
    try {
        for (const item of items) {
            // Subtract from Origin
            await db.query('UPDATE inventory_levels SET stock = stock - $1 WHERE warehouse_id = $2 AND product_id = $3', [item.quantity, from, item.product_id]);
            // Add to Destination
            await db.query(`INSERT INTO inventory_levels (product_id, warehouse_id, stock) VALUES ($1,$2,$3) 
                            ON CONFLICT (product_id, warehouse_id) DO UPDATE SET stock = inventory_levels.stock + $3`, [item.product_id, to, item.quantity]);
            // Log Move
            await db.query('INSERT INTO inventory_movements (product_id, warehouse_id, user_id, type, quantity, reason) VALUES ($1,$2,$3,$4,$5,$6)', 
                           [item.product_id, to, req.user.id, 'Entrada (Traspaso)', item.quantity, `Traspaso desde almacén ID:${from}`]);
        }
        await db.query('INSERT INTO inventory_transfers (from_warehouse_id, to_warehouse_id, items, user_id) VALUES ($1,$2,$3,$4)', [from, to, JSON.stringify(items), req.user.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Basic Catalogues
app.get('/api/users', async (req, res) => {
    const r = await db.query('SELECT id, name, email, role, status, last_login FROM users ORDER BY name ASC');
    res.json(r.rows);
});

app.get('/api/clients', async (req, res) => {
    const r = await db.query('SELECT * FROM clients ORDER BY name ASC');
    res.json(r.rows);
});

app.get('/api/leads', async (req, res) => {
    const r = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(r.rows);
});

app.post('/api/leads', async (req, res) => {
    const l = req.body;
    const r = await db.query('INSERT INTO leads (name, email, phone, source, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *', [l.name, l.email, l.phone, l.source || 'Web', l.notes]);
    res.json(r.rows[0]);
});

app.get('/api/appointments', async (req, res) => {
    const r = await db.query('SELECT a.*, c.name as client_name FROM appointments a LEFT JOIN clients c ON a.client_id = c.id');
    res.json(r.rows);
});

app.post('/api/appointments', async (req, res) => {
    const { client_id, technician, date, time, duration, type } = req.body;
    const r = await db.query('INSERT INTO appointments (client_id, technician, date, time, duration, type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [client_id, technician, date, time, duration, type]);
    res.json(r.rows[0]);
});

app.get('/api/manuals', async (req, res) => {
    const r = await db.query('SELECT * FROM manuals ORDER BY updated_at DESC');
    res.json(r.rows);
});

app.post('/api/manuals', async (req, res) => {
    const { category, title, content, tags, pdf_url } = req.body;
    await db.query('INSERT INTO manuals (category, title, content, tags, pdf_url) VALUES ($1,$2,$3,$4,$5)', [category, title, content, JSON.stringify(tags), pdf_url]);
    res.json({ success: true });
});

// Purchases, Quotes & Orders
app.get('/api/purchases', async (req, res) => {
    const r = await db.query(`SELECT p.*, v.name as vendor_name, w.name as warehouse_name FROM purchases p 
                             LEFT JOIN vendors v ON p.vendor_id = v.id 
                             LEFT JOIN warehouses w ON p.warehouse_id = w.id ORDER BY p.created_at DESC`);
    res.json(r.rows);
});

app.post('/api/purchases', async (req, res) => {
    const { vendor_id, warehouse_id, total, items, status } = req.body;
    const result = await db.query('INSERT INTO purchases (vendor_id, warehouse_id, total, items, status) VALUES ($1,$2,$3,$4,$5) RETURNING id', [vendor_id, warehouse_id || 1, total, JSON.stringify(items), status]);
    const purchaseId = result.rows[0].id;
    if (status === 'Recibido') {
        for (const item of items) {
            await db.query(`INSERT INTO inventory_levels (product_id, warehouse_id, stock) VALUES ($1, $2, $3) 
                            ON CONFLICT (product_id, warehouse_id) DO UPDATE SET stock = inventory_levels.stock + $3`, [item.product_id, warehouse_id || 1, item.quantity]);
            await db.query('INSERT INTO inventory_movements (product_id, warehouse_id, user_id, type, quantity, reason) VALUES ($1, $2, $3, $4, $5, $6)', 
                           [item.product_id, warehouse_id || 1, req.user.id, 'Entrada', item.quantity, `Compra Recibida #${purchaseId}`]);
        }
    }
    res.json({ success: true, id: purchaseId });
});

app.get('/api/quotes', async (req, res) => {
    const r = await db.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(r.rows);
});

app.get('/api/orders', async (req, res) => {
    const r = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(r.rows);
});

app.get('/api/settings/public', async (req, res) => {
    const r = await db.query("SELECT data FROM app_settings WHERE category = 'general_info'");
    res.json(r.rows[0]?.data || {});
});

app.get('/api/cms/content', async (req, res) => {
    const r = await db.query("SELECT data FROM app_settings WHERE category = 'cms_content'");
    res.json(r.rows[0]?.data || []);
});

app.post('/api/cms/content', async (req, res) => {
    await db.query("INSERT INTO app_settings (category, data) VALUES ('cms_content', $1) ON CONFLICT (category) DO UPDATE SET data = $1", [JSON.stringify(req.body.content)]);
    res.json({ success: true });
});

// Serve Frontend
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, HOST, () => console.log(`🚀 SUPERAIR Server running on http://${HOST}:${PORT}`));
