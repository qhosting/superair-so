import express from 'express';
import * as db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from "@google/genai";
import { sendWhatsApp } from './services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'superair_secret_key_2024';

const app = express();
app.use(express.json({ limit: '20mb' }));

// Middleware para extraer IP real tras proxies
app.set('trust proxy', true);

// Iniciar DB
db.initDatabase();

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

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
    let { email, password } = req.body;
    email = (email || '').toLowerCase().trim();
    password = (password || '').trim();

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
    } catch (e) { 
        res.status(500).json({ error: 'Error interno de autenticación' }); 
    }
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

// --- INVENTORY API ---
app.get('/api/products', authenticate, async (req, res) => {
    const { warehouse_id } = req.query;
    try {
        let query = "SELECT *, id::text as id, price::float, cost::float, stock::float, min_stock::float FROM products ORDER BY name ASC";
        // Future implementation: Filter by warehouse using warehouse_stock table
        const result = await db.query(query);
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

app.post('/api/products/bulk', authenticate, authorize(['Super Admin']), async (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'Formato inválido' });

    const client = await db.pool.connect();
    try {
        await client.query("BEGIN");
        for (const p of products) {
            await client.query(
                `INSERT INTO products (code, name, category, cost, price, stock)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (code) DO UPDATE SET stock = products.stock + $6`,
                [p.code, p.name, p.category, p.cost, p.price, p.stock || 0]
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

app.post('/api/inventory/adjust', authenticate, authorize(['Super Admin', 'Admin']), async (req, res) => {
    const { productId, newStock, reason } = req.body;
    try {
        const result = await db.query(
            "UPDATE products SET stock = $1 WHERE id = $2::integer RETURNING *",
            [newStock, productId]
        );
        // Aquí se podría agregar un log a tabla 'inventory_movements'
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/warehouses', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT *, id::text as id FROM warehouses ORDER BY name ASC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- VENDORS API ---
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

// --- QUOTES API ---
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
        const prompt = `Como experto auditor de HVAC, revisa esta lista de materiales para una instalación:
        ${JSON.stringify(items)}
        Identifica si faltan consumibles críticos (gas, soldadura, cinta, soportes) o si hay incompatibilidades obvias.
        Responde en 1 párrafo corto y directo. Si todo parece bien, di "Auditoría Aprobada: Lista de materiales coherente."`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        res.json({ feedback: response.text });
    } catch (e) { res.status(500).json({ error: 'Falla en IA' }); }
});

// --- ORDERS & SALES API ---
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
    const { orderId, amount, method } = req.body;
    try {
        await db.query(`
            UPDATE orders
            SET paid_amount = paid_amount + $1,
                status = CASE WHEN (paid_amount + $1) >= total THEN 'Completado' ELSE status END
            WHERE id = $2::integer
        `, [amount, orderId]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders/:id/remind', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const orderRes = await db.query("SELECT o.*, c.phone, c.name FROM orders o JOIN clients c ON o.client_id = c.id WHERE o.id = $1::integer", [id]);
        if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });

        const order = orderRes.rows[0];
        const message = `Hola ${order.name}, recordatorio de pago pendiente por $${order.total - order.paid_amount} referente a la orden #${order.id}. Gracias.`;

        // Use sendWhatsApp from services.js
        if (order.phone) {
             await sendWhatsApp(order.phone, message);
             res.json({ success: true });
        } else {
             res.status(400).json({ error: 'Cliente sin teléfono' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error enviando recordatorio' });
    }
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

app.get('/api/appointments', authenticate, async (req, res) => {
    try {
        const result = await db.query("SELECT a.*, c.name as client_name FROM appointments a JOIN clients c ON a.client_id = c.id ORDER BY a.date DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SuperAir Server Running on Port ${PORT}`);
});