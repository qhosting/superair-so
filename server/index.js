
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp } from './services.js';

const app = express();
app.use(express.json());

// --- INVENTARIO AVANZADO ---

// Buscar producto por código de barras / SKU
app.get('/api/inventory/lookup/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const r = await db.query("SELECT * FROM products WHERE code = $1", [code]);
        if (r.rows.length === 0) return res.status(404).json({ error: "SKU no encontrado." });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener valuación total de inventario
app.get('/api/inventory/valuation', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT 
                COALESCE(SUM(stock * cost), 0) as total_valuation,
                COALESCE(SUM(CASE WHEN stock < min_stock THEN 1 ELSE 0 END), 0) as critical_items,
                category,
                SUM(stock * cost) as category_value
            FROM products 
            GROUP BY category
        `);
        
        const summary = {
            total: r.rows.reduce((acc, curr) => acc + Number(curr.category_value), 0),
            critical: r.rows[0]?.critical_items || 0,
            breakdown: r.rows.map(row => ({ name: row.category, value: Number(row.category_value) }))
        };
        res.json(summary);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Registrar Ajuste de Inventario (Soporta Merma/Daño y Decimales)
app.post('/api/inventory/adjust', async (req, res) => {
    const { product_id, warehouse_id, quantity, type, reason } = req.body;
    try {
        // Validación de tipo de movimiento para mermas
        const sign = (type === 'Salida' || type === 'Merma') ? -1 : 1;
        const adjustedQty = Number(quantity) * sign;

        await db.query("BEGIN");
        
        // 1. Actualizar stock global del producto
        await db.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [adjustedQty, product_id]);
        
        // 2. Actualizar stock por almacén (suponiendo tabla warehouse_stock)
        await db.query(`
            INSERT INTO warehouse_stock (product_id, warehouse_id, stock) 
            VALUES ($1, $2, $3)
            ON CONFLICT (product_id, warehouse_id) 
            DO UPDATE SET stock = warehouse_stock.stock + $3
        `, [product_id, warehouse_id, adjustedQty]);

        // 3. Registrar en Kardex
        await db.query(`
            INSERT INTO inventory_movements (product_id, warehouse_id, type, quantity, reason, user_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [product_id, warehouse_id, type, quantity, reason, 1]); // user_id hardcoded para dev

        await db.query("COMMIT");
        res.json({ success: true, message: "Ajuste aplicado correctamente." });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

// --- MÓDULO VENTAS & RENTABILIDAD ---

app.get('/api/orders', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT o.*, c.name as "clientName", c.phone as "clientPhone"
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            ORDER BY o.created_at DESC
        `);

        const enrichedOrders = r.rows.map(order => {
            const created = new Date(order.created_at);
            let days = 0;
            if (order.payment_terms.includes('30')) days = 30;
            if (order.payment_terms.includes('15')) days = 15;
            
            const dueDate = new Date(created);
            dueDate.setDate(created.getDate() + days);
            
            const isOverdue = new Date() > dueDate && Number(order.paid_amount) < Number(order.total);
            
            // Rentabilidad: (Venta - Costo) / Venta
            const profit = Number(order.total) - Number(order.cost_total);
            const profitMargin = order.total > 0 ? (profit / Number(order.total)) * 100 : 0;
            
            return {
                ...order,
                clientName: order.clientName,
                clientPhone: order.clientPhone,
                paidAmount: Number(order.paid_amount),
                dueDate: dueDate.toISOString(),
                isOverdue,
                profitMargin,
                commission: profit * 0.10 // 10% sobre la utilidad neta como estándar
            };
        });

        res.json(enrichedOrders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recordatorio de Pago Automatizado via WhatsApp
app.post('/api/orders/:id/remind', async (req, res) => {
    const { id } = req.params;
    try {
        const r = await db.query(`
            SELECT o.*, c.name as "clientName", c.phone as "clientPhone"
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE o.id = $1
        `, [id]);
        
        const order = r.rows[0];
        if (!order || !order.clientPhone) throw new Error("Datos insuficientes para el recordatorio.");

        const balance = Number(order.total) - Number(order.paid_amount);
        const message = `Hola ${order.clientName}, de SuperAir. 👋 Te recordamos que tienes un saldo pendiente de $${balance.toLocaleString()} MXN correspondiente a la orden #${order.id}. ¿Gustas que te apoyemos con los datos de transferencia? 🌬️`;

        await sendWhatsApp(order.clientPhone, message);
        res.json({ success: true, message: "Recordatorio enviado." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cierre Técnico con Evidencia
app.post('/api/orders/:id/close-technical', async (req, res) => {
    const { id } = req.params;
    const { evidenceUrl } = req.body;
    try {
        if (!evidenceUrl) throw new Error("Se requiere la URL de la evidencia fotográfica.");
        await db.query("UPDATE orders SET evidence_url = $1, technical_closed_at = NOW() WHERE id = $2", [evidenceUrl, id]);
        res.json({ success: true, message: "Evidencia registrada. Orden lista para auditoría final." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3000, () => console.log('🚀 SuperAir Backend running on port 3000'));
