import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';
import redis from './redis.js';
import bcrypt from 'bcryptjs';

// Global Error Handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('❌ CRITICAL: Uncaught Exception:', err);
  // Keep process alive if possible or let Docker restart it cleanly
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Configuración de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

// Middleware
app.use(express.json());

// Configuración de Puerto
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// --- DATA SEEDING (Productos del Usuario) ---
const seedSpecificProducts = async () => {
  try {
    const countRes = await db.query('SELECT COUNT(*) FROM products');
    if (parseInt(countRes.rows[0].count) > 0) return; // Ya hay productos

    console.log('📦 Sembrando base de datos de productos personalizada...');

    const productsToInsert = [
      { name: '24000 BTU/H CASSETTE TYPE COOLING & HEATING 220V', price: 507.16, cat: 'Unidad AC', desc: 'SETEFC261X' },
      { name: '27000 BTU/H MULTI-SPLIT TYPE 1 DRIVE 3', price: 1141.35, cat: 'Unidad AC', desc: 'CSC271Y' },
      { name: '36000 BTU/H MULTI-SPLIT TYPE 1 DRIVE 4', price: 1869.80, cat: 'Unidad AC', desc: 'CSC361Y' },
      { name: '4 WAY, CASSETTE COMPACTO, MAGNUM SERIES 1.5 TON', price: 317.30, cat: 'Unidad AC', desc: 'SETEFC181M' },
      { name: '4 WAY, CASSETTE, MAGNUM SERIES 2 TONELADAS', price: 469.17, cat: 'Unidad AC', desc: 'SETEFC241N' },
      { name: '4 WAY, CASSETTE, MAGNUM SERIES 3 TONELADAS', price: 10686.73, cat: 'Unidad AC', desc: 'SETEFC361N (MXN)' },
      { name: '4 WAY, CASSETTE, MAGNUM SERIES 4.5 TONELADAS', price: 628.57, cat: 'Unidad AC', desc: 'SETEFC541N' },
      { name: 'ACUMULADOR DE SUCCION 1/2 SPORLAN', price: 1140.00, cat: 'Refacción', desc: '' },
      { name: 'AGARRADERA DE UÑA 1/2 PULGADA', price: 10.88, cat: 'Insumo', desc: '' },
      { name: 'AGARRADERA DE UÑA 1 PULGADA', price: 21.75, cat: 'Insumo', desc: '' },
      { name: 'AIRE TIPO VENTA MIRAGE, 1.5 TON, SOLO FRIO 115V', price: 8620.00, cat: 'Unidad AC', desc: 'MACC1821N' },
      { name: 'AIRE TIPO VENTA MIRAGE, 1 TON, SOLO FRIO 115V', price: 5375.00, cat: 'Unidad AC', desc: 'MACC1211N' },
      { name: 'AISLANTE ARMAFLEX 2 1/8 1.8M', price: 128.00, cat: 'Insumo', desc: '' },
      { name: 'Armaflex 3/4" x 3/8" espesor', price: 54.61, cat: 'Insumo', desc: '' },
      { name: 'Armaflex 7/8" x 3/8" espesor', price: 59.76, cat: 'Insumo', desc: '' },
      { name: 'ASPA CONDENSADOR AIRE X2', price: 561.00, cat: 'Refacción', desc: '' },
      { name: 'BASE FABRICADA A MEDIDA CON PTR SOLDADA', price: 1430.00, cat: 'Insumo', desc: '' },
      { name: 'BOLSA MINI SPLIT SERVICIO 1 TONELADA', price: 289.00, cat: 'Herramienta', desc: 'MCB1218A' },
      { name: 'BOMBA CONDENSADOS MAXI ORANGE 220V', price: 3362.00, cat: 'Refacción', desc: '' },
      { name: 'BOMBA CONDENSADOS UNIVOLTAJE GP 1 TR a 3 TR', price: 1400.00, cat: 'Refacción', desc: '' },
      { name: 'Bomba de Vacio 3.6 CFM, 1/2 HP', price: 3806.25, cat: 'Herramienta', desc: '' },
      { name: 'CABLE USO RUDO DE COBRE 3 POLOS, CALIBRE 10', price: 123.00, cat: 'Insumo', desc: 'Por metro' },
      { name: 'CALENTADOR DE AGUA DE PASO TURBO FLUX 16L', price: 5964.00, cat: 'Unidad AC', desc: 'Gas LP' },
      { name: 'CAMBIO DE CONDENSADOR 1 TONELADA (Mano de Obra)', price: 1100.00, cat: 'Servicio', desc: 'Incluye vacío del sistema' },
      { name: 'CAMBIO TARJETA DE CONDENSADOR 3 TONS', price: 732.75, cat: 'Servicio', desc: '' },
      { name: 'CARGA REFRIGERANTE', price: 500.00, cat: 'Servicio', desc: '' },
      { name: 'CONDENSADOR CI MAGNUM, INVERTER 18,000 BTU', price: 705.26, cat: 'Unidad AC', desc: 'CLC181N' },
      { name: 'CONDENSADOR CI MAGNUM, INVERTER 24,000 BTU', price: 942.86, cat: 'Unidad AC', desc: 'CLC241N' },
      { name: 'CONDENSADOR CI MAGNUM, INVERTER 36,000 BTU', price: 24363.20, cat: 'Unidad AC', desc: 'CLC361N' },
      { name: 'GAS REFRIGERANTE R410a, BOYA 11.34 KG', price: 2228.00, cat: 'Insumo', desc: '' },
      { name: 'Evaporador 12000 Btu/h wall-mounted', price: 207.00, cat: 'Refacción', desc: 'EWC121X' }
    ];

    for (const p of productsToInsert) {
      await db.query(
        'INSERT INTO products (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5)',
        [p.name, p.desc, p.price, 10, p.cat]
      );
    }
    console.log(`✅ ${productsToInsert.length} Productos importados correctamente.`);
  } catch (e) {
    console.error('Error seeding products:', e);
  }
};

const seedTemplates = async () => {
    try {
        const count = await db.query('SELECT COUNT(*) FROM templates');
        if (parseInt(count.rows[0].count) > 0) return;
        
        console.log('📄 Sembrando plantillas...');

        await db.query(`
            INSERT INTO templates (code, name, subject, content, variables) VALUES 
            (
                'email_quote', 
                'Correo de Cotización', 
                'Cotización {{quote_id}} - Propuesta SuperAir', 
                'Hola {{client_name}},\n\nAdjunto encontrarás la propuesta económica detallada para tu proyecto de climatización.\n\nTotal: {{total}}\n\nQuedamos atentos a tus comentarios.\n\nAtte.\nEquipo SuperAir', 
                '["{{client_name}}", "{{quote_id}}", "{{total}}"]'
            ),
            (
                'email_invoice',
                'Correo de Factura',
                'Factura y XML - Servicio SuperAir',
                'Estimado {{client_name}},\n\nGracias por su pago. Adjunto encontrará los archivos fiscales correspondientes a su servicio.\n\nSaludos cordiales.',
                '["{{client_name}}"]'
            )
        `);
    } catch(e) { console.error("Error seeding templates", e); }
};

const seedSettings = async () => {
  try {
    const count = await db.query("SELECT COUNT(*) FROM app_settings");
    if (parseInt(count.rows[0].count) > 0) return;

    console.log('⚙️ Sembrando configuración inicial...');

    const companyInfo = {
      name: 'SuperAir de México S.A. de C.V.',
      rfc: 'SAM180512HVA',
      email: 'contacto@superair.com.mx',
      phone: '442 332 5814',
      address: 'Av. de la Luz 402, Juriquilla, Qro.',
      currency: 'MXN',
      timezone: 'America/Mexico_City'
    };

    const billingInfo = {
      taxRate: 16,
      quotePrefix: 'COT',
      orderPrefix: 'ORD',
      invoicePrefix: 'FACT',
      nextQuoteNumber: 1024,
      defaultTerms: '50/50'
    };

    await db.query(
      "INSERT INTO app_settings (category, data) VALUES ($1, $2), ($3, $4)",
      ['company_info', JSON.stringify(companyInfo), 'billing_info', JSON.stringify(billingInfo)]
    );

  } catch (e) { console.error("Error seeding settings", e); }
};

// --- INICIALIZACIÓN DB ---
const initDB = async () => {
  try {
    // 1. Usuarios (Auth)
    await db.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'Admin', status TEXT DEFAULT 'Activo', last_login TIMESTAMP)`);
    
    // Admin Original
    const adminCheck = await db.query("SELECT * FROM users WHERE email = 'admin@superair.com.mx'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(`INSERT INTO users (name, email, password, role) VALUES ('Super Admin', 'admin@superair.com.mx', $1, 'Super Admin')`, [hashedPassword]);
    }

    // Nuevo Admin QHosting
    const qAdminCheck = await db.query("SELECT * FROM users WHERE email = 'admin@qhosting.net'");
    if (qAdminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('x0420EZS*', 10);
      await db.query(`INSERT INTO users (name, email, password, role) VALUES ('Admin QHosting', 'admin@qhosting.net', $1, 'Super Admin')`, [hashedPassword]);
      console.log('🔑 Usuario Admin QHosting creado');
    }

    // 2. Clientes
    await db.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT, rfc TEXT, type TEXT DEFAULT 'Residencial', status TEXT DEFAULT 'Prospecto', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    try { await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS rfc TEXT`); } catch (e) {}

    // 3. Productos
    await db.query(`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, price NUMERIC, stock INTEGER DEFAULT 0, category TEXT, min_stock INTEGER DEFAULT 5, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // 4. CMS
    await db.query(`CREATE TABLE IF NOT EXISTS cms_content (id SERIAL PRIMARY KEY, section_id TEXT UNIQUE, content JSONB, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // 5. Citas
    await db.query(`CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), technician TEXT, date DATE, time TIME, type TEXT, status TEXT, google_event_link TEXT)`);

    // 6. Cotizaciones
    await db.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id), client_name TEXT, total NUMERIC, status TEXT DEFAULT 'Borrador', items JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    try { await db.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_name TEXT`); } catch (e) {}

    // 7. Ordenes
    await db.query(`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, quote_id INTEGER REFERENCES quotes(id), client_name TEXT, total NUMERIC, paid_amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'Pendiente', installation_date DATE, cfdi_status TEXT DEFAULT 'Pendiente', fiscal_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // 8. Plantillas
    await db.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT,
        subject TEXT,
        content TEXT,
        variables JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Configuración App
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        category TEXT PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tablas del Sistema Verificadas en Producción');

    // Run Seeds
    await seedSpecificProducts();
    await seedTemplates();
    await seedSettings();

  } catch (err) {
    console.error('❌ Error inicializando Tablas:', err.message, err.stack);
  }
};

db.checkConnection().then(connected => {
  if(connected) {
    initDB();
  } else {
    console.warn('⚠️ Server started without DB connection. Retrying in background...');
  }
});

// --- API ENDPOINTS ---

app.get('/api/health', async (req, res) => {
  // Simple health check that doesn't depend on DB to be fully ready immediately,
  // to prevent container restart during slow startups.
  res.json({ status: 'ok', timestamp: new Date() });
});

// ... (Auth, Users, CMS endpoints remain the same) ...
// === AUTH & USERS ===
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, lastLogin: new Date().toISOString() } });
      } else { res.status(401).json({ error: 'Contraseña incorrecta' }); }
    } else { res.status(401).json({ error: 'Usuario no encontrado' }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
  try { const r = await db.query('SELECT id, name, email, role, status, last_login as "lastLogin" FROM users ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  try { const hashedPassword = await bcrypt.hash(password, 10); await db.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hashedPassword, role]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/users/:id', async (req, res) => {
  try { await db.query('DELETE FROM users WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// CMS
app.get('/api/cms/content', async (req, res) => {
  try {
    const cached = await redis.get('cms_landing_content');
    if (cached) return res.json(JSON.parse(cached));
    const result = await db.query('SELECT content FROM cms_content WHERE section_id = $1', ['landing_sections']);
    if (result.rows.length > 0) {
      const content = result.rows[0].content;
      await redis.set('cms_landing_content', JSON.stringify(content), 'EX', 3600);
      res.json(content);
    } else { res.json(null); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/cms/content', async (req, res) => {
  const { content } = req.body;
  try {
    const check = await db.query('SELECT id FROM cms_content WHERE section_id = $1', ['landing_sections']);
    if (check.rows.length > 0) { await db.query('UPDATE cms_content SET content = $1, updated_at = NOW() WHERE section_id = $2', [JSON.stringify(content), 'landing_sections']); } 
    else { await db.query('INSERT INTO cms_content (section_id, content) VALUES ($1, $2)', ['landing_sections', JSON.stringify(content)]); }
    await redis.del('cms_landing_content');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Products
app.get('/api/products', async (req, res) => { try { const result = await db.query('SELECT * FROM products ORDER BY name ASC'); res.json(result.rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/products', async (req, res) => { const { name, description, price, stock, category } = req.body; try { const result = await db.query('INSERT INTO products (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, description, price, stock, category]); res.json(result.rows[0]); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/products/:id', async (req, res) => { try { await db.query('DELETE FROM products WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Clients
app.get('/api/clients', async (req, res) => { try { const r = await db.query('SELECT * FROM clients ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/clients', async (req, res) => { const { name, email, phone, address, type, status, notes, rfc } = req.body; try { const r = await db.query('INSERT INTO clients (name, email, phone, address, type, status, notes, rfc) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [name, email, phone, address, type, status, notes, rfc]); res.json(r.rows[0]); } catch (e) { res.status(500).json({ error: e.message }); } });
app.delete('/api/clients/:id', async (req, res) => { try { await db.query('DELETE FROM clients WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Appointments
app.get('/api/appointments', async (req, res) => { try { const r = await db.query('SELECT a.*, c.name as client_name FROM appointments a LEFT JOIN clients c ON a.client_id = c.id ORDER BY a.date ASC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/appointments', async (req, res) => { const { client_id, technician, date, time, type, status } = req.body; try { const r = await db.query('INSERT INTO appointments (client_id, technician, date, time, type, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [client_id, technician, date, time, type, status]); res.json(r.rows[0]); } catch (e) { res.status(500).json({ error: e.message }); } });

// Quotes & Orders
app.get('/api/quotes', async (req, res) => { try { const r = await db.query('SELECT * FROM quotes ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/quotes', async (req, res) => { const { client_name, total, items } = req.body; try { const r = await db.query('INSERT INTO quotes (client_name, total, items, status) VALUES ($1, $2, $3, $4) RETURNING *', [client_name, total, JSON.stringify(items), 'Borrador']); res.json(r.rows[0]); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/quotes/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('BEGIN');
        const quoteRes = await db.query("UPDATE quotes SET status = 'Aceptada' WHERE id = $1 RETURNING *", [id]);
        if (quoteRes.rows.length === 0) throw new Error('Quote not found');
        const quote = quoteRes.rows[0];
        const orderRes = await db.query(`INSERT INTO orders (quote_id, client_name, total, status) VALUES ($1, $2, $3, 'Pendiente') RETURNING *`, [quote.id, quote.client_name, quote.total]);
        await db.query('COMMIT');
        res.json({ success: true, order: orderRes.rows[0], quote: quote });
    } catch (e) { await db.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', async (req, res) => { try { const r = await db.query('SELECT id::text, client_name as "clientName", total, paid_amount as "paidAmount", status, cfdi_status as "cfdiStatus", installation_date as "installationDate", fiscal_data as "fiscalData" FROM orders ORDER BY id DESC'); res.json(r.rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/orders', async (req, res) => { const { id, paidAmount, status, cfdiStatus, fiscalData } = req.body; try { if (id) { await db.query(`UPDATE orders SET paid_amount = COALESCE($2, paid_amount), status = COALESCE($3, status), cfdi_status = COALESCE($4, cfdi_status), fiscal_data = COALESCE($5, fiscal_data) WHERE id = $1`, [id, paidAmount, status, cfdiStatus, fiscalData ? JSON.stringify(fiscalData) : null]); res.json({ success: true }); } else { res.status(400).json({ error: 'ID required' }); } } catch (e) { res.status(500).json({ error: e.message }); } });

// --- TEMPLATES & SETTINGS ENDPOINTS ---
app.get('/api/templates', async (req, res) => {
    try {
        const r = await db.query('SELECT * FROM templates ORDER BY name ASC');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/templates/:code', async (req, res) => {
    const { code } = req.params;
    const { subject, content } = req.body;
    try {
        await db.query('UPDATE templates SET subject = $1, content = $2, updated_at = NOW() WHERE code = $3', [subject, content, code]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM app_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.category] = row.data;
        });
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    const { category, data } = req.body;
    try {
        await db.query(
            'INSERT INTO app_settings (category, data) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET data = $2, updated_at = NOW()',
            [category, JSON.stringify(data)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/trigger-n8n', (req, res) => res.json({ success: true }));

// Static Files (Prod)
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist', 'index.html')));
}

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});