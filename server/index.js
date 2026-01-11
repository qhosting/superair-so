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
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import { sendWhatsApp, sendChatwootMessage } from './services.js';

// --- CONFIG & HANDLERS ---
process.on('uncaughtException', (err) => console.error('❌ CRITICAL:', err));
process.on('unhandledRejection', (reason, promise) => console.error('❌ CRITICAL REJECTION:', reason));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_change_in_prod';
const N8N_API_KEY = process.env.N8N_API_KEY || 'superair_n8n_master_key';

// Asegurar directorio de uploads
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// --- CONFIGURACIÓN EXTERNA ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Configuración SMTP para Correos Reales
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI 
);

// --- MIDDLEWARES ---
const authenticateToken = (req, res, next) => {
  const publicPaths = [
    '/api/auth/login', 
    '/api/health', 
    '/api/cms/content', 
    '/api/webhooks/leads',
    '/api/webhooks/invoices',
    '/api/settings/public'
  ];
  if (publicPaths.includes(req.path) || req.path.startsWith('/api/n8n') || (req.method === 'GET' && req.path.startsWith('/uploads'))) {
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

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
};

app.use('/api', authenticateToken);

// --- DB INIT ---
const initDB = async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'Admin', status TEXT DEFAULT 'Activo', last_login TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, rfc TEXT, type TEXT DEFAULT 'Residencial', status TEXT DEFAULT 'Prospecto', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, price NUMERIC, stock INTEGER DEFAULT 0, category TEXT, min_stock INTEGER DEFAULT 5, cost NUMERIC DEFAULT 0, type TEXT DEFAULT 'product', price_wholesale NUMERIC DEFAULT 0, price_vip NUMERIC DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS cms_content (id SERIAL PRIMARY KEY, section_id TEXT UNIQUE, content JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), technician TEXT, date DATE, time TIME, type TEXT, status TEXT, duration INTEGER DEFAULT 60, google_event_link TEXT)`);
    await db.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), client_name TEXT, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, payment_terms TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, quote_id INTEGER REFERENCES quotes(id), client_name TEXT, total NUMERIC, paid_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'Pendiente', installation_date DATE, cfdi_status TEXT DEFAULT 'Pendiente', fiscal_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS app_settings (category TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, title TEXT, message TEXT, type TEXT DEFAULT 'info', is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, source TEXT DEFAULT 'Manual', campaign TEXT, status TEXT DEFAULT 'Nuevo', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS fiscal_inbox (uuid TEXT PRIMARY KEY, rfc_emitter TEXT, rfc_receiver TEXT, legal_name TEXT, amount NUMERIC, xml_url TEXT, pdf_url TEXT, origin_email TEXT, received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, linked_order_id INTEGER, status TEXT DEFAULT 'Unlinked')`);
    
    // Nueva Tabla: Movimientos de Inventario (Kardex)
    await db.query(`CREATE TABLE IF NOT EXISTS inventory_movements (id SERIAL PRIMARY KEY, product_id INTEGER, user_name TEXT, type TEXT, quantity INTEGER, reason TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // Ensure Admin
    const adminCheck = await db.query("SELECT * FROM users WHERE email = 'admin@superair.com.mx'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(`INSERT INTO users (name, email, password, role) VALUES ('Super Admin', 'admin@superair.com.mx', $1, 'Super Admin')`, [hashedPassword]);
    }
    console.log('✅ DB Init Complete');
  } catch (err) { console.error('❌ Error Init DB:', err); }
};
db.checkConnection().then(connected => { if(connected) initDB(); });


// --- 📧 EMAIL SENDING ---
app.post('/api/send-email', upload.single('attachment'), async (req, res) => {
    const { to, subject, text } = req.body;
    const file = req.file;

    try {
        const mailOptions = {
            from: `"SuperAir ERP" <${process.env.SMTP_USER}>`,
            to: to,
            subject: subject,
            text: text,
            attachments: file ? [{
                filename: file.originalname,
                path: file.path
            }] : []
        };

        const info = await transporter.sendMail(mailOptions);
        
        if (file) fs.unlinkSync(file.path);

        res.json({ success: true, messageId: info.messageId });
    } catch (e) {
        console.error("Email Error:", e);
        res.status(500).json({ error: "Error enviando correo. Verifique configuración SMTP." });
    }
});


// --- 🧠 AI CHAT AGENT ---
app.post('/api/ai/chat', async (req, res) => {
    const { message } = req.body;
    try {
        const settingsRes = await db.query("SELECT data FROM app_settings WHERE category = 'marketing_info'");
        const marketingSettings = settingsRes.rows[0]?.data || {};
        const provider = marketingSettings.aiProvider || 'gemini';
        
        let reply = "";
        const systemPrompt = "Eres el Asistente Operativo de SuperAir. Responde breve y profesionalmente.";

        if (provider === 'openai' && process.env.OPENAI_API_KEY) {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                model: "gpt-4-turbo",
            });
            reply = completion.choices[0].message.content;
        } else {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-latest", systemInstruction: systemPrompt });
            const result = await model.generateContent(message);
            reply = result.response.text();
        }
        res.json({ reply, provider });
    } catch (e) {
        res.status(500).json({ error: "AI no disponible" });
    }
});


// --- 📦 ORDERS & PAYMENTS ---
app.post('/api/orders/pay', authorize(['Admin', 'Super Admin']), async (req, res) => {
    const { orderId, amount, method } = req.body;
    try {
        await db.query('BEGIN');
        
        const orderCheck = await db.query("SELECT total, paid_amount FROM orders WHERE id = $1", [orderId]);
        if (orderCheck.rows.length === 0) throw new Error("Orden no encontrada");
        
        const order = orderCheck.rows[0];
        const newPaidAmount = Number(order.paid_amount) + Number(amount);
        const newStatus = newPaidAmount >= Number(order.total) ? 'Completado' : 'Pendiente';

        await db.query("UPDATE orders SET paid_amount = $1, status = $2 WHERE id = $3", [newPaidAmount, newStatus, orderId]);
        
        await db.query('COMMIT');
        res.json({ success: true, newPaidAmount, status: newStatus });
    } catch (e) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/orders/complete', authorize(['Admin', 'Super Admin']), async (req, res) => {
    const { orderId } = req.body;
    try {
        await db.query('BEGIN');
        const orderRes = await db.query(`SELECT o.id, q.items FROM orders o JOIN quotes q ON o.quote_id = q.id WHERE o.id = $1`, [orderId]);
        if (orderRes.rows.length === 0) throw new Error("Orden no encontrada");
        
        const items = orderRes.rows[0].items; 

        for (const item of items) {
            const prodCheck = await db.query("SELECT type, stock, name FROM products WHERE id = $1", [item.productId]);
            if (prodCheck.rows.length > 0) {
                const product = prodCheck.rows[0];
                if (product.type === 'product') {
                    const newStock = product.stock - item.quantity;
                    await db.query("UPDATE products SET stock = $1 WHERE id = $2", [newStock, item.productId]);
                    
                    await db.query("INSERT INTO inventory_movements (product_id, user_name, type, quantity, reason) VALUES ($1, $2, 'Salida', $3, $4)", 
                        [item.productId, req.user.name, item.quantity, `Venta Orden #${orderId}`]
                    );

                    if (newStock < 5) {
                         await db.query("INSERT INTO notifications (title, message, type) VALUES ($1, $2, 'warning')", ['Stock Bajo', `Producto ${product.name} bajo de stock.`]);
                    }
                }
            }
        }
        await db.query("UPDATE orders SET status = 'Completado' WHERE id = $1", [orderId]);
        await db.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    }
});

// --- CMS ROUTES ---
app.get('/api/cms/content', async (req, res) => { 
    try { 
        const r = await db.query("SELECT content FROM cms_content WHERE section_id = 'main'"); 
        res.json(r.rows[0]?.content || []); 
    } catch (e) { res.status(500).json([]); } 
});

app.post('/api/cms/content', authorize(['Admin', 'Super Admin']), async (req, res) => { 
    try { 
        await db.query("INSERT INTO cms_content (section_id, content) VALUES ('main', $1) ON CONFLICT (section_id) DO UPDATE SET content = $1", [JSON.stringify(req.body.content)]); 
        res.json({success:true}); 
    } catch (e) { res.status(500).json({error:e.message}); } 
});


// --- LEADS MANAGEMENT ---
app.get('/api/leads', async (req, res) => { try { const r = await db.query('SELECT * FROM leads ORDER BY created_at DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });

app.post('/api/leads', async (req, res) => { 
    const l = req.body; 
    try { 
        const r = await db.query("INSERT INTO leads (name, email, phone, source, status, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [l.name, l.email, l.phone, l.source || 'Manual', l.status || 'Nuevo', l.notes]); 
        res.json(r.rows[0]); 
    } catch(e){res.status(500).json({error:e.message});} 
});

app.put('/api/leads/:id', async (req, res) => { 
    const l = req.body; 
    try { 
        await db.query("UPDATE leads SET status=$1, notes=$2 WHERE id=$3", [l.status, l.notes, req.params.id]); 
        res.json({success:true}); 
    } catch(e){res.status(500).json({error:e.message});} 
});

app.delete('/api/leads/:id', authorize(['Admin', 'Super Admin']), async (req, res) => { 
    try { 
        await db.query("DELETE FROM leads WHERE id=$1", [req.params.id]); 
        res.json({success:true}); 
    } catch(e){res.status(500).json({error:e.message});} 
});

app.post('/api/leads/:id/convert', authorize(['Admin', 'Super Admin']), async (req, res) => { 
    try { 
        await db.query('BEGIN'); 
        const leadRes = await db.query("SELECT * FROM leads WHERE id=$1", [req.params.id]); 
        const lead = leadRes.rows[0]; 
        const clientRes = await db.query("INSERT INTO clients (name, email, phone, status, notes, type) VALUES ($1,$2,$3,'Activo', $4, 'Residencial') RETURNING *", [lead.name, lead.email, lead.phone, `Convertido de Lead #${lead.id}`]); 
        await db.query("UPDATE leads SET status='Ganado' WHERE id=$1", [req.params.id]); 
        await db.query('COMMIT'); 
        res.json({success:true, client: clientRes.rows[0]}); 
    } catch(e){ 
        await db.query('ROLLBACK'); 
        res.status(500).json({error:e.message}); 
    } 
});


// --- CLIENTS MANAGEMENT ---
app.get('/api/clients', async (req, res) => { try { const r = await db.query('SELECT * FROM clients ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });

app.post('/api/clients', authorize(['Admin', 'Super Admin']), async (req, res) => { 
    const c = req.body; 
    try { 
        await db.query("INSERT INTO clients (name, email, phone, address, rfc, type, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [c.name, c.email, c.phone, c.address, c.rfc, c.type, c.status, c.notes]); 
        res.json({success:true}); 
    } catch(e){res.status(500).json({error:e.message});} 
});

app.delete('/api/clients/:id', authorize(['Admin', 'Super Admin']), async (req, res) => { 
    try { 
        await db.query("DELETE FROM clients WHERE id=$1", [req.params.id]); 
        res.json({success:true}); 
    } catch(e){res.status(500).json({error:e.message});} 
});


// --- NOTIFICATIONS ---
app.get('/api/notifications', async (req, res) => { 
    try { 
        const r = await db.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20"); 
        res.json(r.rows); 
    } catch(e){res.status(500).json([]);} 
});

app.post('/api/notifications/mark-read', async (req, res) => { 
    try { 
        await db.query("UPDATE notifications SET is_read = TRUE"); 
        res.json({success:true}); 
    } catch(e){res.status(500).json({error:e.message});} 
});


// --- FISCAL & INVOICING ---
app.get('/api/fiscal/inbox', async (req, res) => { 
    try { 
        const r = await db.query("SELECT * FROM fiscal_inbox WHERE status = 'Unlinked'"); 
        res.json(r.rows); 
    } catch(e){res.status(500).json([]);} 
});

app.post('/api/orders/:id/link-fiscal', authorize(['Admin', 'Super Admin']), async (req, res) => { 
    try { 
        const { fiscalUuid } = req.body; 
        await db.query('BEGIN'); 
        const fiscalRes = await db.query("SELECT * FROM fiscal_inbox WHERE uuid=$1", [fiscalUuid]); 
        const fiscal = fiscalRes.rows[0]; 
        await db.query("UPDATE orders SET fiscal_data = $1, cfdi_status = 'Timbrado' WHERE id=$2", [JSON.stringify(fiscal), req.params.id]); 
        await db.query("UPDATE fiscal_inbox SET status='Linked', linked_order_id=$1 WHERE uuid=$2", [req.params.id, fiscalUuid]); 
        await db.query('COMMIT'); 
        res.json({success:true}); 
    } catch(e){ 
        await db.query('ROLLBACK'); 
        res.status(500).json({error:e.message}); 
    } 
});


// --- USERS MANAGEMENT ---
app.get('/api/users', authorize(['Super Admin', 'Admin']), async (req, res) => { try { const r = await db.query('SELECT id, name, email, role, status, last_login as "lastLogin" FROM users ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });

app.post('/api/users', authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { name, email, password, role, status } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password || 'temp1234', 10);
        await db.query("INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5)", [name, email, hashedPassword, role, status]);
        res.json({success:true});
    } catch(e) { res.status(500).json({error:e.message}); }
});

app.delete('/api/users/:id', authorize(['Super Admin', 'Admin']), async (req, res) => {
    try {
        await db.query("DELETE FROM users WHERE id=$1", [req.params.id]);
        res.json({success:true});
    } catch(e) { res.status(500).json({error:e.message}); }
});


// --- 🏭 INVENTORY & PRODUCTS ---
app.get('/api/products', async (req, res) => { try { const r = await db.query('SELECT * FROM products ORDER BY name ASC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });

app.post('/api/products', authorize(['Admin', 'Super Admin']), async (req, res) => {
    const p = req.body;
    try {
        if (p.id) {
            const oldProd = await db.query("SELECT stock FROM products WHERE id = $1", [p.id]);
            if (oldProd.rows.length > 0) {
                const diff = p.stock - oldProd.rows[0].stock;
                if (diff !== 0) {
                    await db.query("INSERT INTO inventory_movements (product_id, user_name, type, quantity, reason) VALUES ($1, $2, $3, $4, 'Ajuste Manual')", 
                        [p.id, req.user.name, diff > 0 ? 'Entrada' : 'Salida', Math.abs(diff)]
                    );
                }
            }
            await db.query(`UPDATE products SET name=$1, description=$2, price=$3, stock=$4, category=$5, min_stock=$6, cost=$7, type=$8, price_wholesale=$9, price_vip=$10 WHERE id=$11`,
                [p.name, p.description, p.price, p.stock, p.category, p.min_stock, p.cost, p.type, p.price_wholesale, p.price_vip, p.id]
            );
        } else {
            const r = await db.query(`INSERT INTO products (name, description, price, stock, category, min_stock, cost, type, price_wholesale, price_vip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
                [p.name, p.description, p.price, p.stock, p.category, p.min_stock, p.cost, p.type, p.price_wholesale, p.price_vip]
            );
             await db.query("INSERT INTO inventory_movements (product_id, user_name, type, quantity, reason) VALUES ($1, $2, 'Entrada', $3, 'Inventario Inicial')", 
                [r.rows[0].id, req.user.name, p.stock]
            );
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', authorize(['Admin', 'Super Admin']), async (req, res) => {
    try {
        await db.query("DELETE FROM products WHERE id=$1", [req.params.id]);
        res.json({success:true});
    } catch(e) { res.status(500).json({error:e.message}); }
});

// --- BASIC GETS ---
app.get('/api/quotes', async (req, res) => { try { const r = await db.query('SELECT id, client_id, client_name, total, status, items, created_at, payment_terms as "paymentTerms" FROM quotes ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/orders', async (req, res) => { try { const r = await db.query('SELECT id::text, quote_id, client_name as "clientName", total, paid_amount as "paidAmount", status, cfdi_status as "cfdiStatus", installation_date as "installationDate", fiscal_data as "fiscalData" FROM orders ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });

// --- SETTINGS ---
app.post('/api/settings', async (req, res) => { 
    const { category, data } = req.body; 
    try { 
        await db.query('INSERT INTO app_settings (category, data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET data = $2', [category, data]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});
app.get('/api/settings', async (req, res) => { try { const r = await db.query('SELECT * FROM app_settings'); const settings = {}; r.rows.forEach(row => { settings[row.category] = row.data; }); res.json(settings); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/settings/public', async (req, res) => {
    try {
        const r = await db.query("SELECT data FROM app_settings WHERE category = 'general_info'");
        res.json(r.rows[0]?.data || {});
    } catch (e) { res.status(500).json({}); }
});


// --- APPOINTMENTS ---
app.get('/api/appointments', async (req, res) => { try { const r = await db.query('SELECT a.id, a.client_id, c.name as client_name, a.technician, a.date, a.time, a.type, a.status, a.duration, a.google_event_link FROM appointments a LEFT JOIN clients c ON a.client_id = c.id'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });

app.post('/api/appointments', authorize(['Admin', 'Super Admin']), async (req, res) => {
    const { client_id, technician, date, time, type, status, duration } = req.body;
    try {
        const r = await db.query("INSERT INTO appointments (client_id, technician, date, time, type, status, duration) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [client_id, technician, date, time, type, status, duration]);
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({error:e.message}); }
});

app.put('/api/appointments/:id', authorize(['Admin', 'Super Admin', 'Instalador']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const oldAptRes = await db.query('SELECT status, client_id, technician, type, time FROM appointments WHERE id = $1', [id]);
        if (oldAptRes.rows.length === 0) return res.status(404).json({error: 'Cita no encontrada'});
        
        const oldApt = oldAptRes.rows[0];
        
        await db.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, id]);
        
        if (status === 'En Proceso' && oldApt.status !== 'En Proceso') {
            const clientRes = await db.query('SELECT phone, name FROM clients WHERE id = $1', [oldApt.client_id]);
            if (clientRes.rows.length > 0) {
                const client = clientRes.rows[0];
                if (client.phone) {
                    const msg = `🚗 Hola ${client.name}, tu técnico de SuperAir (${oldApt.technician}) va en camino para tu servicio de ${oldApt.type}. Nos vemos pronto.`;
                    console.log(`Sending WhatsApp to ${client.phone}: ${msg}`);
                    sendWhatsApp(client.phone, msg).catch(err => console.error("WhatsApp Error:", err.message));
                }
            }
        }

        res.json({ success: true, status });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});


// --- AUTH & MISC ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/auth/login', async (req, res) => {
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

// --- SERVING FRONTEND IN PRODUCTION ---
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  
  app.use(express.static(distPath));

  app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});