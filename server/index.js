
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

const authorize = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'No autorizado' });
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'No tiene permisos' });
  next();
};

app.use('/api', authenticateToken);

const initDB = async () => {
  try {
    console.log("🛠️ Inicializando Tablas Multi-Inventario y Compras...");
    
    // Base Tables
    await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'Admin', status TEXT DEFAULT 'Activo', last_login TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, rfc TEXT, type TEXT DEFAULT 'Residencial', status TEXT DEFAULT 'Prospecto', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, code TEXT, name TEXT NOT NULL, description TEXT, price NUMERIC, category TEXT, min_stock INTEGER DEFAULT 5, cost NUMERIC DEFAULT 0, type TEXT DEFAULT 'product', requires_serial BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // NEW: Multi-Inventory & Procurement
    await db.query(`CREATE TABLE IF NOT EXISTS vendors (id SERIAL PRIMARY KEY, name TEXT NOT NULL, rfc TEXT, contact_name TEXT, phone TEXT, email TEXT, address TEXT, credit_days INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS warehouses (id SERIAL PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'Central', responsible_id INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_levels (product_id INTEGER REFERENCES products(id), warehouse_id INTEGER REFERENCES warehouses(id), stock INTEGER DEFAULT 0, PRIMARY KEY (product_id, warehouse_id))`);
    await db.query(`CREATE TABLE IF NOT EXISTS serial_numbers (serial TEXT PRIMARY KEY, product_id INTEGER REFERENCES products(id), warehouse_id INTEGER REFERENCES warehouses(id), status TEXT DEFAULT 'Disponible', last_movement_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS purchases (id SERIAL PRIMARY KEY, vendor_id INTEGER REFERENCES vendors(id), total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_transfers (id SERIAL PRIMARY KEY, from_warehouse_id INTEGER REFERENCES warehouses(id), to_warehouse_id INTEGER REFERENCES warehouses(id), items JSONB, status TEXT DEFAULT 'Completado', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, user_id INTEGER REFERENCES users(id))`);
    
    // NEW: Operative Manuals
    await db.query(`CREATE TABLE IF NOT EXISTS manuals (id SERIAL PRIMARY KEY, category TEXT, title TEXT NOT NULL, content TEXT, tags JSONB, pdf_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // Standard Modules
    await db.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), client_name TEXT, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, payment_terms TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, quote_id INTEGER REFERENCES quotes(id), client_name TEXT, total NUMERIC, paid_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'Pendiente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS app_settings (category TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, title TEXT, message TEXT, type TEXT DEFAULT 'info', is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, source TEXT DEFAULT 'Manual', status TEXT DEFAULT 'Nuevo', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // Migrations for existing
    const migrations = [
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_serial BOOLEAN DEFAULT FALSE",
        "INSERT INTO warehouses (name, type) SELECT 'Bodega Central', 'Central' WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE name = 'Bodega Central')"
    ];
    for(const m of migrations) await db.query(m).catch(e => console.warn(`Mig skip: ${m}`));

    // Seed Initial Manuals if empty
    const manualCheck = await db.query("SELECT COUNT(*) FROM manuals");
    if (manualCheck.rows[0].count === '0') {
      await db.query(`INSERT INTO manuals (category, title, content) VALUES 
        ('Instalación', 'Protocolo de Vacío Certificado', 'Para toda instalación SuperAir, es obligatorio realizar vacío a 500 micras usando bomba de 6CFM mínimo...'),
        ('Seguridad', 'EPP para Alturas', 'El uso de arnés de seguridad es obligatorio al trabajar en azoteas sin barandal o a más de 1.8 metros...'),
        ('Administrativo', 'Recepción de Pagos en Sitio', 'Los técnicos no deben recibir efectivo a menos que sea autorizado vía ticket por administración...')`);
    }

    // Default Admin
    const adminCheck = await db.query("SELECT * FROM users WHERE email = 'admin@superair.com.mx'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(`INSERT INTO users (name, email, password, role) VALUES ('Super Admin', 'admin@superair.com.mx', $1, 'Super Admin')`, [hashedPassword]);
    }
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

// --- MANUALS ---
app.get('/api/manuals', async (req, res) => {
    const r = await db.query('SELECT * FROM manuals ORDER BY category ASC, title ASC');
    res.json(r.rows);
});
app.post('/api/manuals', async (req, res) => {
    const { category, title, content, tags, pdf_url } = req.body;
    await db.query('INSERT INTO manuals (category, title, content, tags, pdf_url) VALUES ($1,$2,$3,$4,$5)', [category, title, content, JSON.stringify(tags || []), pdf_url || null]);
    res.json({success: true});
});
app.put('/api/manuals/:id', async (req, res) => {
    const { id } = req.params;
    const { category, title, content, tags, pdf_url } = req.body;
    await db.query('UPDATE manuals SET category=$1, title=$2, content=$3, tags=$4, pdf_url=$5, updated_at=NOW() WHERE id=$6', [category, title, content, JSON.stringify(tags || []), pdf_url || null, id]);
    res.json({success: true});
});

// --- VENDORS ---
app.get('/api/vendors', async (req, res) => {
    const r = await db.query('SELECT * FROM vendors ORDER BY name ASC');
    res.json(r.rows);
});
app.post('/api/vendors', async (req, res) => {
    const v = req.body;
    await db.query('INSERT INTO vendors (name, rfc, contact_name, phone, email, address, credit_days) VALUES ($1,$2,$3,$4,$5,$6,$7)', [v.name, v.rfc, v.contact_name, v.phone, v.email, v.address, v.credit_days]);
    res.json({success: true});
});

// --- PURCHASES ---
app.get('/api/purchases', async (req, res) => {
    const r = await db.query('SELECT p.*, v.name as vendor_name FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id ORDER BY p.created_at DESC');
    res.json(r.rows);
});

app.post('/api/purchases', async (req, res) => {
    const { vendor_id, total, items, status } = req.body;
    try {
        const result = await db.query('INSERT INTO purchases (vendor_id, total, items, status) VALUES ($1,$2,$3,$4) RETURNING id', [vendor_id, total, JSON.stringify(items), status]);
        const purchaseId = result.rows[0].id;

        // If received, update inventory immediately in Central Warehouse (id 1)
        if (status === 'Recibido') {
            for (const item of items) {
                // Update Central Warehouse (Assume ID 1 is Central)
                await db.query('INSERT INTO inventory_levels (product_id, warehouse_id, stock) VALUES ($1, 1, $2) ON CONFLICT (product_id, warehouse_id) DO UPDATE SET stock = inventory_levels.stock + $2', [item.product_id, item.quantity]);
                // Update average cost in products table
                await db.query('UPDATE products SET cost = $1 WHERE id = $2', [item.cost, item.product_id]);
                // Handle Serials if provided
                if (item.serials && Array.isArray(item.serials)) {
                    for (const serial of item.serials) {
                        await db.query('INSERT INTO serial_numbers (serial, product_id, warehouse_id) VALUES ($1,$2,1)', [serial, item.product_id]);
                    }
                }
            }
        }
        res.json({ success: true, id: purchaseId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- WAREHOUSES & LEVELS ---
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
    const { warehouse_id } = req.params;
    const r = await db.query(`
        SELECT p.id, p.name, p.code, p.category, COALESCE(l.stock, 0) as stock 
        FROM products p 
        LEFT JOIN inventory_levels l ON p.id = l.product_id AND l.warehouse_id = $1
        WHERE p.type = 'product'
    `, [warehouse_id]);
    res.json(r.rows);
});

// --- TRANSFERS ---
app.post('/api/inventory/transfer', async (req, res) => {
    const { from_warehouse_id, to_warehouse_id, items } = req.body;
    try {
        await db.query('BEGIN');
        for (const item of items) {
            // Subtract from source
            await db.query('UPDATE inventory_levels SET stock = stock - $1 WHERE product_id = $2 AND warehouse_id = $3', [item.quantity, item.product_id, from_warehouse_id]);
            // Add to destination
            await db.query('INSERT INTO inventory_levels (product_id, warehouse_id, stock) VALUES ($1, $2, $3) ON CONFLICT (product_id, warehouse_id) DO UPDATE SET stock = inventory_levels.stock + $3', [item.product_id, to_warehouse_id, item.quantity]);
            // Move serials if specified
            if (item.serials) {
                for (const sn of item.serials) {
                    await db.query('UPDATE serial_numbers SET warehouse_id = $1 WHERE serial = $2', [to_warehouse_id, sn]);
                }
            }
        }
        await db.query('INSERT INTO inventory_transfers (from_warehouse_id, to_warehouse_id, items, user_id) VALUES ($1,$2,$3,$4)', [from_warehouse_id, to_warehouse_id, JSON.stringify(items), req.user.id]);
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (e) { await db.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
});

// --- REMAINING ROUTES (CLIENTS, QUOTES, LEADS, etc - REUSE EXISTING) ---
app.get('/api/clients', async (req, res) => { const r = await db.query('SELECT * FROM clients ORDER BY id DESC'); res.json(r.rows); });
app.get('/api/products', async (req, res) => {
    const r = await db.query(`
        SELECT p.*, (SELECT SUM(stock) FROM inventory_levels WHERE product_id = p.id) as stock 
        FROM products p ORDER BY id DESC
    `);
    res.json(r.rows);
});
app.post('/api/products', async (req, res) => {
    const p = req.body;
    await db.query('INSERT INTO products (code, name, description, price, cost, category, type, requires_serial) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [p.code, p.name, p.description, p.price, p.cost, p.category, p.type || 'product', p.requires_serial || false]);
    res.json({success: true});
});
app.get('/api/users', async (req, res) => { const r = await db.query('SELECT id, name, email, role, status FROM users'); res.json(r.rows); });
app.get('/api/leads', async (req, res) => { const r = await db.query('SELECT * FROM leads ORDER BY created_at DESC'); res.json(r.rows); });
app.post('/api/leads', async (req, res) => {
    const { name, phone, email, source } = req.body;
    await db.query('INSERT INTO leads (name, phone, email, source) VALUES ($1,$2,$3,$4)', [name, phone, email, source || 'Manual']);
    res.json({success: true});
});

if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, HOST, () => console.log(`🚀 SUPERAIR Server running on http://${HOST}:${PORT}`));
