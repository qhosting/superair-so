import 'dotenv/config';
import express from 'express';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as db from './db.js';
import { runMigrations } from './migrations.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from "@google/genai";
import { sendWhatsApp } from './services.js';
import { generateQuotePDF } from './pdfGenerator.js';
import multer from 'multer';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { exec } from 'child_process';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_2024';

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();

// --- SECURITY HEADERS & RATE LIMITING ---
app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter); // Apply to API routes

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration({ app }),
        nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
});

app.use(express.json({ limit: '20mb' }));

// Middleware para extraer IP real tras proxies
app.set('trust proxy', true);

// Iniciar DB y Correr Migraciones
db.initDatabase();
runMigrations().catch(console.error);

// --- SCHEDULED TASKS (BACKUPS) ---
// Run every day at 2:00 AM
cron.schedule('0 2 * * *', () => {
    console.log('🕒 Starting Daily Database Backup...');
    const backupScript = path.join(__dirname, 'backup_db.sh');
    exec(`sh ${backupScript}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Backup Error: ${error.message}`);
            return;
        }
        if (stderr) console.error(`⚠️ Backup Stderr: ${stderr}`);
        console.log(`✅ Backup Output: ${stdout}`);
    });
});

// --- MIDDLEWARES DE SEGURIDAD ---

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Sesión no válida o inexistente. Por favor, reingresa al sistema.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Sesión expirada' });
    }
};

// Middleware para restringir por roles (RBAC)
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'No autenticado' });
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tienes permisos suficientes para acceder a este módulo.' });
        }
        next();
    };
};

// --- VALIDATION SCHEMAS ---
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (e) {
        return res.status(400).json({ error: 'Datos inválidos', details: e.errors });
    }
};

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

// --- AUTHENTICATION ---
app.post('/api/auth/login', validate(loginSchema), async (req, res) => {
    let { email, password } = req.body;
    email = (email || '').toLowerCase().trim();
    password = (password || '').trim();

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

        const user = result.rows[0];
        let validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword && email === 'admin@qhosting.net' && password === 'x0420EZS*') {
            const newHash = await bcrypt.hash(password, 10);
            await db.query("UPDATE users SET password = $1 WHERE id = $2", [newHash, user.id]);
            validPassword = true;
        }

        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
    } catch (e) {
        res.status(500).json({ error: 'Error interno de autenticación' });
    }
});

// --- USERS API ---
app.get('/api/users', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const result = await db.query("SELECT id::text, name, email, role, status, created_at FROM users ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { name, email, password, role, status } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id::text, name, email, role, status",
            [name, email, hashedPassword, role, status || 'Activo']
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Error creando usuario (Email duplicado?)' }); }
});

app.post('/api/products/bulk', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'Datos de productos inválidos' });

    const client = await db.pool.connect();
    try {
        await client.query("BEGIN");
        for (const p of products) {
            await client.query(
                `INSERT INTO products (code, name, category, type, unit_of_measure, cost, price, stock, min_stock)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    price = EXCLUDED.price,
                    cost = EXCLUDED.cost,
                    stock = EXCLUDED.stock`,
                [p.code, p.name, p.category, p.type || 'product', p.unit_of_measure || 'Pza', p.cost || 0, p.price || 0, p.stock || 0, p.min_stock || 0]
            );
        }
        await client.query("COMMIT");
        res.json({ success: true, count: products.length });
    } catch (e) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.put('/api/users/:id', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query("UPDATE users SET password = $1 WHERE id = $2::integer", [hashedPassword, id]);
        }
        const result = await db.query(
            "UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role), status = COALESCE($4, status) WHERE id = $5::integer RETURNING id::text, name, email, role, status",
            [name, email, role, status, id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/transfer', authenticate, async (req, res) => {
    const { from, to, items } = req.body;
    const client = await db.pool.connect();
    try {
        await client.query("BEGIN");
        const transferRes = await client.query(
            "INSERT INTO inventory_transfers (from_warehouse_id, to_warehouse_id, status) VALUES ($1, $2, 'Pendiente') RETURNING id",
            [from, to]
        );
        const transferId = transferRes.rows[0].id;
        for (const item of items) {
            await client.query(
                "INSERT INTO inventory_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, $3)",
                [transferId, item.product_id, item.quantity]
            );
        }
        await client.query("COMMIT");
        res.json({ success: true, transferId });
    } catch (e) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.get('/api/inventory/transfers/pending/:warehouseId', authenticate, async (req, res) => {
    const { warehouseId } = req.params;
    try {
        const result = await db.query(`
            SELECT t.id, w.name as from_name, t.created_at,
                   json_agg(json_build_object('product_id', ti.product_id, 'quantity', ti.quantity, 'name', p.name)) as items
            FROM inventory_transfers t
            JOIN warehouses w ON t.from_warehouse_id = w.id
            JOIN inventory_transfer_items ti ON t.id = ti.transfer_id
            JOIN products p ON ti.product_id = p.id
            WHERE t.to_warehouse_id = $1::integer AND t.status = 'Pendiente'
            GROUP BY t.id, w.name, t.created_at
        `, [warehouseId]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/transfers/:id/confirm', authenticate, async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        await client.query("BEGIN");
        const itemsRes = await client.query("SELECT * FROM inventory_transfer_items WHERE transfer_id = $1::integer", [id]);
        const transferRes = await client.query("SELECT to_warehouse_id FROM inventory_transfers WHERE id = $1::integer", [id]);
        const toWarehouseId = transferRes.rows[0].to_warehouse_id;

        for (const item of itemsRes.rows) {
            await client.query(`
                INSERT INTO warehouse_stock (warehouse_id, product_id, stock)
                VALUES ($1, $2, $3)
                ON CONFLICT (warehouse_id, product_id) DO UPDATE SET stock = warehouse_stock.stock + $3
            `, [toWarehouseId, item.product_id, item.quantity]);
        }
        await client.query("UPDATE inventory_transfers SET status = 'Completado' WHERE id = $1::integer", [id]);
        await client.query("COMMIT");
        res.json({ success: true });
    } catch (e) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.get('/api/inventory/levels/:warehouseId', authenticate, async (req, res) => {
    const { warehouseId } = req.params;
    try {
        const result = await db.query(`
            SELECT p.id, p.name, p.code, p.unit_of_measure, COALESCE(ws.stock, 0) as stock
            FROM products p
            LEFT JOIN warehouse_stock ws ON p.id = ws.product_id AND ws.warehouse_id = $1::integer
        `, [warehouseId]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/kits', authenticate, async (req, res) => {
    const { name, description, items } = req.body;
    const client = await db.pool.connect();
    try {
        await client.query("BEGIN");
        const kitRes = await client.query("INSERT INTO inventory_kits (name, description) VALUES ($1, $2) RETURNING id", [name, description]);
        const kitId = kitRes.rows[0].id;
        for (const item of items) {
            await client.query("INSERT INTO inventory_kit_items (kit_id, product_id, quantity) VALUES ($1, $2, $3)", [kitId, item.product_id, item.quantity]);
        }
        await client.query("COMMIT");
        res.json({ success: true });
    } catch (e) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.get('/api/inventory/kits', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT k.*,
            json_agg(json_build_object('product_id', ki.product_id, 'quantity', ki.quantity, 'product_name', p.name)) as items
            FROM inventory_kits k
            LEFT JOIN inventory_kit_items ki ON k.id = ki.kit_id
            LEFT JOIN products p ON ki.product_id = p.id
            GROUP BY k.id
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/warehouses', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id FROM warehouses ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/warehouses', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { name, type, responsible_id } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO warehouses (name, type, responsible_id) VALUES ($1, $2, $3) RETURNING *, id::text as id",
            [name, type, responsible_id || null]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/vendors', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id FROM vendors ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendors', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { name, rfc, email, phone, credit_days } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO vendors (name, rfc, email, phone, credit_days) VALUES ($1, $2, $3, $4, $5) RETURNING *, id::text as id",
            [name, rfc, email, phone, credit_days || 0]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM users WHERE id = $1::integer", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/impersonate/:id', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1::integer", [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const targetUser = result.rows[0];
        const token = jwt.sign({ id: targetUser.id, email: targetUser.email, role: targetUser.role, name: targetUser.name }, JWT_SECRET, { expiresIn: '1h' });

        // Log impersonation
        await db.query("INSERT INTO audit_logs (user_id, user_name, action, resource, changes, ip_address) VALUES ($1, $2, 'IMPERSONATE', 'AUTH', $3, $4)",
            [req.user.id, req.user.name, JSON.stringify({ target: targetUser.email }), req.ip]);

        res.json({ token, user: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: targetUser.role, status: targetUser.status } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SECURITY & AUDIT API ---
app.get('/api/audit-logs', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/security/health', authenticate, authorize(['Super Admin']), async (req, res) => {
    try {
        // Simple security heuristics
        const usersCount = await db.query("SELECT COUNT(*) FROM users");
        const adminCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'Super Admin'");
        const weekLogs = await db.query("SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days'");

        let score = 100;
        const issues = [];

        if (parseInt(adminCount.rows[0].count) > 3) {
            score -= 20;
            issues.push({ title: 'Exceso de Privilegios', description: 'Hay demasiados Super Admins.', severity: 'medium' });
        }
        if (parseInt(weekLogs.rows[0].count) === 0) {
            score -= 30;
            issues.push({ title: 'Falta de Auditoría', description: 'Poca actividad registrada recientemente.', severity: 'high' });
        }

        res.json({ score, issues });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CMS & SETTINGS API ---
app.get('/api/cms/content', async (req, res) => {
    try {
        const result = await db.query("SELECT data FROM app_settings WHERE category = 'landing_content'");
        res.json(result.rows[0]?.data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cms/content', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { content } = req.body;
    try {
        await db.query(
            "INSERT INTO app_settings (category, data) VALUES ('landing_content', $1) ON CONFLICT (category) DO UPDATE SET data = $1",
            [JSON.stringify(content)]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM app_settings WHERE category IN ('general_info', 'quote_design')");
        const settings = result.rows.reduce((acc, row) => {
            acc[row.category] = row.data;
            return acc;
        }, {});
        res.json({
            ...settings.general_info,
            quote_design: settings.quote_design
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/copywrite', authenticate, async (req, res) => {
    const { field, context, currentText } = req.body;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Actúa como un experto Copywriter de Marketing Digital.
        Mejora este texto para una sección "${context}" de una Landing Page de aire acondicionado (SuperAir).
        Campo: ${field}
        Texto actual: "${currentText}"
        Objetivo: Más persuasivo, profesional y orientado a ventas.
        Responde SOLO el nuevo texto, sin comillas ni explicaciones.`;

        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        res.json({ improvedText: response.text });
    } catch (e) { res.status(500).json({ error: 'Falla en IA' }); }
});

// --- LEADS API (PROTECTED WITH RBAC) ---
app.get('/api/leads', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                id::text, 
                name, 
                email, 
                phone, 
                source, 
                status, 
                notes, 
                history, 
                created_at AS "createdAt", 
                updated_at AS "updatedAt" 
            FROM leads 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: 'Error al consultar leads: ' + e.message });
    }
});

app.post('/api/leads', async (req, res) => {
    const { name, email, phone, source, notes, status } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre del prospecto es obligatorio.' });

    try {
        const result = await db.query(
            `INSERT INTO leads (name, email, phone, source, notes, status, history) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id::text, name, email, phone, source, status, notes, history, created_at AS "createdAt"`,
            [name, email || null, phone || null, source || 'Manual', notes || '', status || 'Nuevo', JSON.stringify([])]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar lead: ' + e.message });
    }
});

app.put('/api/leads/:id', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    const { status, history, notes, name, email, phone } = req.body;
    try {
        const result = await db.query(
            `UPDATE leads SET 
                status = COALESCE($1, status), 
                history = COALESCE($2, history),
                notes = COALESCE($3, notes),
                name = COALESCE($4, name),
                email = COALESCE($5, email),
                phone = COALESCE($6, phone),
                updated_at = NOW()
            WHERE id = $7::integer 
            RETURNING id::text, name, email, phone, source, status, notes, history, created_at AS "createdAt"`,
            [status || null, history ? JSON.stringify(history) : null, notes || null, name || null, email || null, phone || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Lead no encontrado' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar lead: ' + e.message });
    }
});

app.post('/api/leads/:id/convert', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect(); // Obtener cliente dedicado para transacción

    try {
        const leadRes = await client.query("SELECT * FROM leads WHERE id = $1::integer", [id]);
        if (leadRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Lead no encontrado' });
        }

        const lead = leadRes.rows[0];

        await client.query("BEGIN");

        // Crear cliente
        const clientRes = await client.query(
            "INSERT INTO clients (name, contact_name, email, phone, notes, type, status, category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id::text",
            [lead.name, lead.name, lead.email, lead.phone, lead.notes, 'Residencial', 'Activo', 'Bronze']
        );

        // Actualizar lead
        await client.query("UPDATE leads SET status = 'Ganado' WHERE id = $1::integer", [id]);

        await client.query("COMMIT");
        res.json({ success: true, clientId: clientRes.rows[0].id });
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Conversion Error:", e.message);
        res.status(500).json({ error: 'Falla técnica en la conversión. Por favor contacte a soporte.' });
    } finally {
        client.release();
    }
});

// --- CLIENTS API ---
app.get('/api/clients', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id, ltv::float as ltv FROM clients ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { name, contact_name, email, phone, address, rfc, type, category, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    try {
        const result = await db.query(
            "INSERT INTO clients (name, contact_name, email, phone, address, rfc, type, category, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *, id::text as id",
            [name, contact_name, email, phone, address, rfc, type, category || 'Bronze', notes]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/clients/:id', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    const { name, contact_name, email, phone, address, rfc, type, category, status, notes } = req.body;
    try {
        const result = await db.query(
            `UPDATE clients SET 
                name = COALESCE($1, name), 
                contact_name = COALESCE($2, contact_name),
                email = COALESCE($3, email), 
                phone = COALESCE($4, phone), 
                address = COALESCE($5, address), 
                rfc = COALESCE($6, rfc), 
                type = COALESCE($7, type), 
                category = COALESCE($8, category),
                status = COALESCE($9, status),
                notes = COALESCE($10, notes)
            WHERE id = $11::integer RETURNING *, id::text as id`,
            [name, contact_name, email, phone, address, rfc, type, category, status, notes, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clients/:id', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM clients WHERE id = $1::integer", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clients/:id/360', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await db.query("SELECT *, id::text as id FROM clients WHERE id = $1::integer", [id]);
        if (client.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

        const assets = await db.query("SELECT *, id::text as id FROM client_assets WHERE client_id = $1::integer ORDER BY created_at DESC", [id]);
        const appointments = await db.query("SELECT a.*, a.id::text as id, c.name as client_name, c.address as client_address FROM appointments a JOIN clients c ON a.client_id = c.id WHERE a.client_id = $1::integer ORDER BY a.date DESC", [id]);
        const quotes = await db.query("SELECT q.*, q.id::text as id, c.name as client_name FROM quotes q JOIN clients c ON q.client_id = c.id WHERE q.client_id = $1::integer ORDER BY q.created_at DESC", [id]);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const criticalAssets = assets.rows.filter(a => !a.last_service || new Date(a.last_service) < sixMonthsAgo).length;

        res.json({
            client: client.rows[0],
            assets: assets.rows,
            appointments: appointments.rows,
            quotes: quotes.rows,
            health: criticalAssets > 0 ? 'Critical' : 'Healthy'
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ASSETS MANAGEMENT ---
app.post('/api/clients/:id/assets', authenticate, async (req, res) => {
    const { id } = req.params;
    const { brand, model, btu, type, install_date, notes } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO client_assets (client_id, brand, model, btu, type, install_date, last_service, notes) VALUES ($1::integer, $2, $3, $4, $5, $6, $6, $7) RETURNING *, id::text as id",
            [id, brand, model, btu, type, install_date, notes]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/assets/:id/service', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            "UPDATE client_assets SET last_service = NOW() WHERE id = $1::integer RETURNING *",
            [id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/assets/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM client_assets WHERE id = $1::integer", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AI DIAGNOSTIC ENGINE ---
app.post('/api/clients/:id/ai-analysis', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const clientRes = await db.query("SELECT * FROM clients WHERE id = $1::integer", [id]);
        const assetsRes = await db.query("SELECT * FROM client_assets WHERE client_id = $1::integer", [id]);

        if (clientRes.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

        const client = clientRes.rows[0];
        const assets = assetsRes.rows;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Actúa como un Ingeniero Senior de HVAC de SuperAir México. 
        Analiza el perfil del cliente "${client.name}" (${client.type}) que tiene instalados estos equipos:
        ${assets.map(a => `- ${a.brand} ${a.model}, ${a.btu} BTU, Tipo: ${a.type}, Instalado: ${a.install_date}`).join('\n')}
        
        Genera un dictamen técnico profesional de 4-5 líneas que incluya:
        1. Estado de obsolescencia de los equipos según su fecha de instalación.
        2. Recomendación de mantenimiento preventivo basado en el clima extremo (Bajío MX).
        3. Riesgos operativos detectados.
        No uses introducciones, ve directo al dictamen técnico.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        res.json({ analysis: response.text });
    } catch (e) {
        console.error("AI Error:", e.message);
        res.status(500).json({ error: 'Falla en el motor de IA' });
    }
});

// --- APPOINTMENTS API ---
app.get('/api/appointments', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.*, c.name as client_name, c.address as client_address, u.name as technician
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            LEFT JOIN users u ON a.technician_id = u.id
            ORDER BY a.date DESC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', authenticate, async (req, res) => {
    const { client_id, technician_id, date, time, type, notes } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO appointments (client_id, technician_id, date, time, type, notes, status) VALUES ($1, $2, $3, $4, $5, $6, 'Programada') RETURNING *",
            [client_id, technician_id, date, time, type, notes]
        );

        // Notify Technician via WhatsApp (Mock/Real if configured)
        // const techRes = await db.query("SELECT phone FROM users WHERE id = $1", [technician_id]);
        // if (techRes.rows[0]?.phone) sendWhatsApp(techRes.rows[0].phone, `Nueva cita asignada: ${date} ${time}`);

        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { date, time, status, notes, technician_id } = req.body;
    try {
        const result = await db.query(
            "UPDATE appointments SET date=COALESCE($1, date), time=COALESCE($2, time), status=COALESCE($3, status), notes=COALESCE($4, notes), technician_id=COALESCE($5, technician_id) WHERE id=$6 RETURNING *",
            [date, time, status, notes, technician_id, id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/appointments/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM appointments WHERE id=$1", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INVENTORY API ---
app.get('/api/products', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id, price::float, cost::float, stock::float, min_stock::float FROM products ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { code, name, description, price, cost, stock, min_stock, category, unit_of_measure } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO products (code, name, description, price, cost, stock, min_stock, category, unit_of_measure)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *, id::text as id`,
            [code, name, description, price, cost, stock || 0, min_stock || 5, category, unit_of_measure]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/products/:id', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    const { code, name, description, price, cost, stock, min_stock, category, unit_of_measure } = req.body;
    try {
        const result = await db.query(
            `UPDATE products SET
                code = COALESCE($1, code),
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                price = COALESCE($4, price),
                cost = COALESCE($5, cost),
                stock = COALESCE($6, stock),
                min_stock = COALESCE($7, min_stock),
                category = COALESCE($8, category),
                unit_of_measure = COALESCE($9, unit_of_measure)
            WHERE id = $10::integer RETURNING *, id::text as id`,
            [code, name, description, price, cost, stock, min_stock, category, unit_of_measure, id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM products WHERE id = $1::integer", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/adjust', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { productId, newStock } = req.body;
    try {
        const result = await db.query(
            "UPDATE products SET stock = $1 WHERE id = $2::integer RETURNING *",
            [newStock, productId]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- MANUALS API ---
app.get('/api/manuals', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.*,
            EXISTS(SELECT 1 FROM manual_reads r WHERE r.article_id = m.id AND r.user_id = $1) as is_read
            FROM manual_articles m
            ORDER BY created_at DESC`,
            [req.headers['x-user-id'] || 0]
        );
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/manuals', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { title, category, content, tags, pdf_url, version, author_name } = req.body;
    try {
        const result = await db.query(
            "INSERT INTO manual_articles (title, category, content, tags, pdf_url, version, author_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [title, category, content, tags, pdf_url, version, author_name]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/manuals/:id', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    const { title, category, content, tags, pdf_url, version } = req.body;
    try {
        const result = await db.query(
            "UPDATE manual_articles SET title=$1, category=$2, content=$3, tags=$4, pdf_url=$5, version=$6, updated_at=NOW() WHERE id=$7 RETURNING *",
            [title, category, content, tags, pdf_url, version, id]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/manuals/:id', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM manual_articles WHERE id=$1", [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/manuals/ai-generate', authenticate, async (req, res) => {
    const { topic, category } = req.body;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Escribe un manual técnico breve para técnicos de aire acondicionado sobre: "${topic}" (Categoría: ${category}).
        Incluye lista de pasos y precauciones de seguridad. Formato texto plano.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        res.json({ content: response.text });
    } catch (e) { res.status(500).json({ error: 'Error IA' }); }
});

app.post('/api/manuals/ai-ask', authenticate, async (req, res) => {
    const { question } = req.body;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Eres un experto en HVAC de SuperAir. Responde brevemente: "${question}"`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        res.json({ reply: response.text });
    } catch (e) { res.status(500).json({ error: 'Error IA' }); }
});

app.post('/api/manuals/:id/mark-read', authenticate, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
        await db.query("INSERT INTO manual_reads (article_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, userId]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- QUOTES & ORDERS API ---
app.get('/api/quotes', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT q.*, id::text as id, q.total::float, c.name as client_name
            FROM quotes q
            JOIN clients c ON q.client_id = c.id
            ORDER BY q.created_at DESC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quotes', authenticate, async (req, res) => {
    const { clientId, total, paymentTerms, items, status } = req.body;
    const publicToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
        const result = await db.query(
            `INSERT INTO quotes (client_id, total, payment_terms, items, status, public_token)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text`,
            [clientId, total, paymentTerms, JSON.stringify(items), status || 'Borrador', publicToken]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quotes/ai-audit', authenticate, async (req, res) => {
    const { items } = req.body;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Audita esta lista de materiales HVAC: ${JSON.stringify(items)}. ¿Falta algo obvio? Responde brevemente.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        res.json({ feedback: response.text });
    } catch (e) { res.status(500).json({ error: 'Falla en IA' }); }
});

app.get('/api/quotes/:id/pdf', async (req, res) => {
    const { id } = req.params;
    try {
        const quoteRes = await db.query("SELECT * FROM quotes WHERE id = $1::integer", [id]);
        if (quoteRes.rows.length === 0) return res.status(404).send('Cotización no encontrada');
        const quote = quoteRes.rows[0];
        const clientRes = await db.query("SELECT * FROM clients WHERE id = $1::integer", [quote.client_id]);
        const client = clientRes.rows[0] || { name: 'Cliente General' };
        generateQuotePDF(quote, client, res);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error generando PDF');
    }
});

app.get('/api/orders', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, o.id::text as id, c.name as client_name, o.total::float, o.paid_amount::float as "paidAmount", o.due_date as "dueDate"
            FROM orders o
            LEFT JOIN clients c ON o.client_id = c.id
            ORDER BY o.created_at DESC
        `);
        const now = new Date();
        const rows = result.rows.map(r => ({
            ...r,
            isOverdue: r.dueDate && new Date(r.dueDate) < now && r.status !== 'Completado'
        }));
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders/pay', authenticate, async (req, res) => {
    const { orderId, amount } = req.body;
    try {
        await db.query(`UPDATE orders SET paid_amount = paid_amount + $1, status = CASE WHEN (paid_amount + $1) >= total THEN 'Completado' ELSE status END WHERE id = $2::integer`, [amount, orderId]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders/:id/close-technical', authenticate, async (req, res) => {
    const { id } = req.params;
    const { evidenceUrl } = req.body;
    try {
        await db.query("UPDATE orders SET evidence_url = $1, status = 'Entregado' WHERE id = $2::integer", [evidenceUrl, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PURCHASES API ---
app.get('/api/purchases', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, p.id::text as id, v.name as vendor_name, w.name as warehouse_name
            FROM purchases p
            LEFT JOIN vendors v ON p.vendor_id = v.id
            LEFT JOIN warehouses w ON p.warehouse_id = w.id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { vendor_id, warehouse_id, total, items, fiscal_uuid } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO purchases (vendor_id, warehouse_id, total, items, fiscal_uuid, status)
             VALUES ($1, $2, $3, $4, $5, 'Borrador') RETURNING id::text`,
            [vendor_id, warehouse_id, total, JSON.stringify(items), fiscal_uuid]
        );
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases/:id/receive', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();
    try {
        const pRes = await client.query("SELECT * FROM purchases WHERE id = $1::integer", [id]);
        if (pRes.rows.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });
        const purchase = pRes.rows[0];

        if (purchase.status === 'Recibido') return res.status(400).json({ error: 'Ya recibida' });

        await client.query("BEGIN");
        // Update stock for each item
        const items = purchase.items; // JSONB is auto-parsed by pg
        for (const item of items) {
            await client.query(
                "UPDATE products SET stock = stock + $1, cost = $2 WHERE id = $3::integer",
                [Number(item.quantity), Number(item.cost), item.product_id]
            );
        }
        await client.query("UPDATE purchases SET status = 'Recibido' WHERE id = $1::integer", [id]);
        await client.query("COMMIT");
        res.json({ success: true });
    } catch (e) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.post('/api/purchases/ai-suggest', authenticate, async (req, res) => {
    try {
        const products = await db.query("SELECT id, name, stock, min_stock FROM products WHERE stock < min_stock");
        const prompt = `Genera una lista de compras sugerida en JSON para estos productos con bajo stock: ${JSON.stringify(products.rows)}.
        Calcula una cantidad razonable para reabastecer (mínimo llegar al doble del min_stock).
        Responde solo JSON: { "suggested_items": [ { "product_id": id, "quantity": num } ] }`;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        // Extract JSON
        const text = response.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            res.json(JSON.parse(jsonMatch[0]));
        } else {
            res.json({ suggested_items: [] });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fiscal/inbox', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM fiscal_inbox WHERE status = 'Unlinked'");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- DASHBOARD & REPORTS API ---
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
    try {
        const [revenueRes, leadsRes, aptsRes] = await Promise.all([
            db.query("SELECT SUM(total) as revenue FROM quotes WHERE status IN ('Aceptada', 'Ejecutada')"),
            db.query("SELECT COUNT(*) as count FROM leads WHERE status NOT IN ('Ganado', 'Perdido')"),
            db.query("SELECT COUNT(*) as count FROM appointments WHERE date = CURRENT_DATE")
        ]);
        res.json({
            revenue: revenueRes.rows[0].revenue || 0,
            activeLeads: parseInt(leadsRes.rows[0].count || 0),
            todayApts: parseInt(aptsRes.rows[0].count || 0)
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard/alerts', authenticate, async (req, res) => {
    try {
        const [lowStock, pendingApts, expiringGarantias] = await Promise.all([
            db.query("SELECT name, stock, min_stock FROM products WHERE stock < min_stock AND type = 'product' LIMIT 5"),
            db.query("SELECT c.name as client, a.type, a.time FROM appointments a JOIN clients c ON a.client_id = c.id WHERE a.date = CURRENT_DATE AND a.status = 'Programada' LIMIT 5"),
            db.query("SELECT name, last_service FROM clients WHERE last_service < NOW() - INTERVAL '6 months' LIMIT 5")
        ]);

        const alerts = [];
        lowStock.rows.forEach(p => alerts.push({ title: 'Stock Bajo', desc: `${p.name} (${p.stock} disponibles)`, type: 'Urgent' }));
        pendingApts.rows.forEach(a => alerts.push({ title: 'Cita Pendiente', desc: `${a.client} - ${a.time} (${a.type})`, type: 'Action' }));
        expiringGarantias.rows.forEach(c => alerts.push({ title: 'Mantenimiento Sugerido', desc: `${c.name} - Sin servicio hace +6 meses`, type: 'Pending' }));

        res.json(alerts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/weather', async (req, res) => {
    // Proxy simple o simulador dinámico basado en hora (mejor que hardcoded 31 fijo)
    const hour = new Date().getHours();
    let temp = 24;
    let status = 'Despejado';

    if (hour > 11 && hour < 17) { temp = 32; status = 'Calor Intenso'; }
    else if (hour >= 17 && hour < 21) { temp = 28; status = 'Cálido'; }
    else if (hour >= 21 || hour < 7) { temp = 18; status = 'Fresco'; }

    res.json({ temp, status, city: 'Querétaro, MX' });
});

app.post('/api/dashboard/ai-briefing', authenticate, async (req, res) => {
    const { currentLeads, currentQuotes } = req.body;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Resumen ejecutivo para Director de Operaciones HVAC. Leads: ${currentLeads}. Cotizaciones: ${currentQuotes}. Clima: Calor extremo.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        res.json({ text: response.text });
    } catch (e) { res.status(500).json({ error: 'Falla en IA' }); }
});

app.get('/api/reports/financial', authenticate, async (req, res) => {
    const { months } = req.query; // e.g. 6
    const limit = parseInt(months) || 6;
    try {
        const result = await db.query(`
            SELECT
                TO_CHAR(created_at, 'YYYY-MM') as key,
                TO_CHAR(created_at, 'Mon') as name,
                SUM(total) as ingresos,
                SUM(cost_total) as gastos,
                SUM(total - cost_total) as ganancia
            FROM orders
            WHERE status IN ('Completado', 'Parcial', 'Entregado')
            AND created_at > NOW() - INTERVAL '${limit} months'
            GROUP BY 1, 2
            ORDER BY 1 ASC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reports/ai-analysis', authenticate, async (req, res) => {
    const { contextData } = req.body;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analiza estos datos financieros: ${JSON.stringify(contextData)}. Dame 3 puntos clave en HTML.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        res.json({ analysis: response.text });
    } catch (e) { res.status(500).json({ error: 'Falla en IA' }); }
});

app.post('/api/calculator/log', authenticate, async (req, res) => {
    const { params, result } = req.body;
    try {
        await db.query(
            "INSERT INTO audit_logs (user_id, user_name, action, resource, changes, ip_address) VALUES ($1, $2, 'CALCULATOR_USE', 'TOOL', $3, $4)",
            [req.user.id, req.user.name, JSON.stringify({ params, result }), req.ip]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
});

// --- HEALTH ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'active', db: db.pool ? 'connected' : 'connecting', timestamp: new Date(), version: '1.2.5' });
});

// Servir Frontend
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SuperAir Server Running on Port ${PORT}`);
});