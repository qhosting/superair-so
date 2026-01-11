

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
import { google } from 'googleapis';
import { sendWhatsApp, sendChatwootMessage } from './services.js';

// --- CONFIG & HANDLERS ---
process.on('uncaughtException', (err) => console.error('❌ CRITICAL:', err));
process.on('unhandledRejection', (reason, promise) => console.error('❌ CRITICAL REJECTION:', reason));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_change_in_prod';

// Asegurar directorio de uploads
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json());
// Servir archivos estáticos subidos (Fase 3)
app.use('/uploads', express.static(UPLOAD_DIR));

// Configuración de Puerto
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// --- 1. CONFIGURACIÓN MULTER (SUBIDA DE ARCHIVOS) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// --- 2. CONFIGURACIÓN NODEMAILER (EMAIL) ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// --- 3. GOOGLE OAUTH2 CLIENT (CALENDAR) ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // ej: https://superair.com.mx/api/auth/google/callback
);

// --- MIDDLEWARES DE SEGURIDAD ---
const authenticateToken = (req, res, next) => {
  const publicPaths = [
    '/api/auth/login', 
    '/api/health', 
    '/api/cms/content', 
    '/api/webhooks/leads',
    '/api/webhooks/invoices' // Public for N8N
  ];
  
  // Allow public paths or uploads GET
  if (publicPaths.includes(req.path) || (req.method === 'GET' && req.path.startsWith('/uploads'))) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acceso Denegado: Token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

// Middleware RBAC (Fase 4)
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes para esta acción' });
    }
    next();
  };
};

app.use('/api', authenticateToken);

// --- INICIALIZACIÓN DB ---
const initDB = async () => {
  try {
    // ... Tablas existentes (users, clients, products, cms_content, appointments, quotes, orders, etc.)
    await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'Admin', status TEXT DEFAULT 'Activo', last_login TIMESTAMP)`);
    // ... (Mantener resto de tablas originales)
    await db.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, rfc TEXT, type TEXT DEFAULT 'Residencial', status TEXT DEFAULT 'Prospecto', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, price NUMERIC, stock INTEGER DEFAULT 0, category TEXT, min_stock INTEGER DEFAULT 5, cost NUMERIC DEFAULT 0, type TEXT DEFAULT 'product', price_wholesale NUMERIC DEFAULT 0, price_vip NUMERIC DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS cms_content (id SERIAL PRIMARY KEY, section_id TEXT UNIQUE, content JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), technician TEXT, date DATE, time TIME, type TEXT, status TEXT, duration INTEGER DEFAULT 60, google_event_link TEXT)`);
    await db.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), client_name TEXT, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, payment_terms TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, quote_id INTEGER REFERENCES quotes(id), client_name TEXT, total NUMERIC, paid_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'Pendiente', installation_date DATE, cfdi_status TEXT DEFAULT 'Pendiente', fiscal_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS templates (id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT, subject TEXT, content TEXT, variables JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS app_settings (category TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, title TEXT, message TEXT, type TEXT DEFAULT 'info', is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, source TEXT DEFAULT 'Manual', campaign TEXT, status TEXT DEFAULT 'Nuevo', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // --- NUEVA TABLA FASE 5: Bóveda Fiscal (Inbox) ---
    await db.query(`
      CREATE TABLE IF NOT EXISTS fiscal_inbox (
        uuid TEXT PRIMARY KEY,
        rfc_emitter TEXT,
        rfc_receiver TEXT,
        legal_name TEXT,
        amount NUMERIC,
        xml_url TEXT,
        pdf_url TEXT,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        linked_order_id INTEGER,
        status TEXT DEFAULT 'Unlinked'
      )
    `);

    // Ensure Admin Exists
    const adminCheck = await db.query("SELECT * FROM users WHERE email = 'admin@superair.com.mx'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(`INSERT INTO users (name, email, password, role) VALUES ('Super Admin', 'admin@superair.com.mx', $1, 'Super Admin')`, [hashedPassword]);
    }

    console.log('✅ Tablas Verificadas. Producción lista.');
  } catch (err) {
    console.error('❌ Error Init DB:', err);
  }
};

db.checkConnection().then(connected => { if(connected) initDB(); });

// --- API ROUTES ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Auth & Users
app.post('/api/auth/login', async (req, res) => {
  // ... (Keep existing login logic)
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
      } else { res.status(401).json({ error: 'Incorrect password' }); }
    } else { res.status(401).json({ error: 'User not found' }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FASE 4: Aplicar Authorize Middleware a rutas sensibles
app.delete('/api/users/:id', authorize(['Super Admin']), async (req, res) => {
    try { await db.query('DELETE FROM users WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/users', authorize(['Super Admin', 'Admin']), async (req, res) => {
    // ... (Create user logic)
    const { name, email, password, role } = req.body;
    try { const hashedPassword = await bcrypt.hash(password, 10); await db.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hashedPassword, role]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/users', authorize(['Super Admin', 'Admin']), async (req, res) => {
    try { const r = await db.query('SELECT id, name, email, role, status, last_login as "lastLogin" FROM users ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); }
});

// FASE 3: UPLOAD ENDPOINT
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// FASE 2: EMAIL SENDING (REAL)
app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, attachments } = req.body;
    
    if (!process.env.SMTP_USER) {
        return res.status(503).json({ error: 'SMTP no configurado en servidor' });
    }

    try {
        const info = await transporter.sendMail({
            from: `"SuperAir" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            attachments: attachments || [] // Expects array of { filename, path/content }
        });
        res.json({ success: true, messageId: info.messageId });
    } catch (e) {
        console.error("Email Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// FASE 1: GOOGLE CALENDAR AUTH (Endpoints Stub for Production)
// Para que esto funcione, el usuario debe configurar las ENV VARS de Google en Docker
app.get('/api/auth/google', (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });
    res.json({ url });
});

app.post('/api/auth/google/callback', async (req, res) => {
    const { code } = req.body;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        // Guardar tokens en app_settings globalmente para la cuenta de empresa
        await db.query(
            "INSERT INTO app_settings (category, data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET data = $2",
            ['google_calendar_tokens', JSON.stringify(tokens)]
        );
        oauth2Client.setCredentials(tokens);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// FASE 5: N8N INVOICE WEBHOOK (Fiscal Vault)
app.post('/api/webhooks/invoices', async (req, res) => {
    console.log('🧾 Factura recibida de N8N:', req.body);
    const { uuid, rfc, rfc_receiver, amount, xml_url, pdf_url, legal_name } = req.body;

    // Validación básica
    if (!uuid || !rfc || !amount) return res.status(400).json({ error: 'Datos fiscales incompletos' });

    try {
        await db.query('BEGIN');

        // 1. Guardar en Inbox Fiscal
        await db.query(
            `INSERT INTO fiscal_inbox (uuid, rfc_emitter, rfc_receiver, amount, xml_url, pdf_url, legal_name, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Unlinked')
             ON CONFLICT (uuid) DO NOTHING`,
            [uuid, rfc, rfc_receiver, amount, xml_url, pdf_url, legal_name]
        );

        // 2. Intentar asignación automática (Match por RFC Cliente)
        // Buscamos si existe el cliente
        const clientRes = await db.query("SELECT * FROM clients WHERE rfc = $1", [rfc_receiver]); // Asumiendo que el cliente es el RECEPTOR si es factura de venta
        // Nota: En facturas de GASTOS, nosotros somos receptor. En ventas, nosotros somos EMISOR.
        // Asumiremos que esto es para VENTAS, así que buscamos al cliente por el RFC del RECEPTOR.
        
        if (clientRes.rows.length > 0) {
            const client = clientRes.rows[0];
            // Notificar que llegó factura de cliente conocido
            await db.query("INSERT INTO notifications (title, message, type) VALUES ($1, $2, 'info')", [
                'Factura Recibida', `CFDI de ${client.name} por $${amount} disponible en Bóveda.`
            ]);
        } else {
             await db.query("INSERT INTO notifications (title, message, type) VALUES ($1, $2, 'warning')", [
                'Factura Desconocida', `CFDI recibido (RFC: ${rfc_receiver}) no coincide con clientes.`
            ]);
        }

        await db.query('COMMIT');
        res.json({ success: true, message: 'Factura procesada en bóveda' });
    } catch (e) {
        await db.query('ROLLBACK');
        console.error("Invoice Webhook Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint para leer la bóveda fiscal desde el Frontend
app.get('/api/fiscal/inbox', async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM fiscal_inbox WHERE status = 'Unlinked' ORDER BY received_at DESC");
        // Mapear a formato frontend FiscalData
        const data = r.rows.map(row => ({
            uuid: row.uuid,
            rfc: row.rfc_receiver, // Mostramos al cliente
            legalName: row.legal_name,
            amount: Number(row.amount),
            xmlUrl: row.xml_url,
            pdfUrl: row.pdf_url,
            issuedAt: row.received_at
        }));
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ... (Resto de endpoints existentes: Clients, Quotes, Orders, Settings, Leads, CMS)
// Mantener endpoints existentes pero asegurarse de que usen `db.query` y no memoria.

// Quotes (Ejemplo de mantenimiento)
app.get('/api/quotes', async (req, res) => { 
    try { const r = await db.query('SELECT id, client_id, client_name, total, status, items, created_at, payment_terms as "paymentTerms" FROM quotes ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } 
});
app.post('/api/quotes', async (req, res) => { 
    const { client_name, total, items, paymentTerms } = req.body; 
    try { 
        const r = await db.query('INSERT INTO quotes (client_name, total, items, status, payment_terms) VALUES ($1, $2, $3, $4, $5) RETURNING *', [client_name, total, JSON.stringify(items), 'Borrador', paymentTerms]); 
        res.json(r.rows[0]); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});
// ... (Resto igual)

// Orders
app.get('/api/orders', async (req, res) => { try { const r = await db.query('SELECT id::text, client_name as "clientName", total, paid_amount as "paidAmount", status, cfdi_status as "cfdiStatus", installation_date as "installationDate", fiscal_data as "fiscalData" FROM orders ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
// ...

// Clients
app.get('/api/clients', async (req, res) => { try { const r = await db.query('SELECT * FROM clients ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/clients', async (req, res) => { const { name, email, phone, address, type, status, notes, rfc } = req.body; try { const r = await db.query('INSERT INTO clients (name, email, phone, address, type, status, notes, rfc) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [name, email, phone, address, type, status, notes, rfc]); res.json(r.rows[0]); } catch (e) { res.status(500).json({ error: e.message }); } });
app.delete('/api/clients/:id', async (req, res) => { try { await db.query('DELETE FROM clients WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Static Files
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist', 'index.html')));
}

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});