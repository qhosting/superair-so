
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
import { GoogleGenAI, Type } from "@google/genai";
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
    console.log("🛠️ Sincronizando Esquema SuperAir v1.4 (Clientes 360)...");
    
    // Core
    await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'Admin', status TEXT DEFAULT 'Activo', last_login TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, rfc TEXT, type TEXT DEFAULT 'Residencial', status TEXT DEFAULT 'Prospecto', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, code TEXT, name TEXT NOT NULL, description TEXT, price NUMERIC, cost NUMERIC DEFAULT 0, category TEXT, min_stock INTEGER DEFAULT 5, type TEXT DEFAULT 'product', requires_serial BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // New: Technical Assets Table
    await db.query(`CREATE TABLE IF NOT EXISTS client_assets (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        brand TEXT,
        model TEXT,
        btu INTEGER,
        type TEXT,
        install_date DATE,
        last_service DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

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
    
    // Leads v1.3
    await db.query(`CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY, 
        name TEXT NOT NULL, 
        email TEXT, 
        phone TEXT, 
        source TEXT DEFAULT 'Manual', 
        campaign TEXT, 
        status TEXT DEFAULT 'Nuevo', 
        notes TEXT, 
        ai_score INTEGER, 
        ai_analysis TEXT,
        history JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS manuals (id SERIAL PRIMARY KEY, category TEXT, title TEXT NOT NULL, content TEXT, tags JSONB, pdf_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, client_id INTEGER, technician TEXT, date DATE, time TIME, duration INTEGER, type TEXT, status TEXT DEFAULT 'Programada')`);

    // --- SEED DATA ---
    const adminCheck = await db.query("SELECT id FROM users WHERE email = 'admin@superair.com.mx'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query("INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5)", ['Administrador SuperAir', 'admin@superair.com.mx', hashedPassword, 'Super Admin', 'Activo']);
    }
    await db.query("INSERT INTO warehouses (name, type) SELECT 'Bodega Central', 'Central' WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE id = 1)");
    console.log('✅ Base de datos SuperAir lista.');
  } catch (err) { console.error('❌ DB INIT ERROR:', err.message); }
};

db.checkConnection().then(async connected => { 
  if(connected) {
    await initDB();
    app.listen(PORT, HOST, () => console.log(`🚀 SUPERAIR Server running on http://${HOST}:${PORT}`));
  }
});

// --- CLIENTS 360 ENDPOINTS ---

app.get('/api/clients', async (req, res) => {
    try {
        // Enriquecemos la respuesta con LTV y última cita
        const r = await db.query(`
            SELECT c.*, 
            (SELECT SUM(total) FROM quotes WHERE client_id = c.id AND status = 'Aceptada') as ltv,
            (SELECT date FROM appointments WHERE client_id = c.id ORDER BY date DESC LIMIT 1) as last_service
            FROM clients c 
            ORDER BY c.name ASC
        `);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Database error" }); }
});

app.post('/api/clients', async (req, res) => {
    const { name, email, phone, address, rfc, type, status, notes } = req.body;
    try {
        const r = await db.query(
            "INSERT INTO clients (name, email, phone, address, rfc, type, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [name, email, phone, address, rfc, type, status, notes]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Assets Management
app.get('/api/clients/:id/assets', async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM client_assets WHERE client_id = $1 ORDER BY install_date DESC", [req.params.id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients/:id/assets', async (req, res) => {
    const { brand, model, btu, type, install_date, last_service, notes } = req.body;
    try {
        const r = await db.query(
            "INSERT INTO client_assets (client_id, brand, model, btu, type, install_date, last_service, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [req.params.id, brand, model, btu, type, install_date, last_service, notes]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/assets/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM client_assets WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// full profile 360
app.get('/api/clients/:id/360', async (req, res) => {
    const { id } = req.params;
    try {
        const [client, assets, quotes, appointments] = await Promise.all([
            db.query("SELECT * FROM clients WHERE id = $1", [id]),
            db.query("SELECT * FROM client_assets WHERE client_id = $1", [id]),
            db.query("SELECT * FROM quotes WHERE client_id = $1 ORDER BY created_at DESC", [id]),
            db.query("SELECT * FROM appointments WHERE client_id = $1 ORDER BY date DESC", [id])
        ]);
        res.json({
            client: client.rows[0],
            assets: assets.rows,
            quotes: quotes.rows,
            appointments: appointments.rows
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OTROS ENDPOINTS (Leads, Auth, Health...) ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/leads', async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM leads ORDER BY created_at DESC");
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Database error" }); }
});
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (r.rows.length > 0) {
      const user = r.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
      } else { res.status(401).json({ error: 'Contraseña incorrecta' }); }
    } else { res.status(401).json({ error: 'Usuario no encontrado' }); }
  } catch (err) { res.status(500).json({ error: 'Error interno del servidor' }); }
});
