
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp } from './services.js';

const app = express();
app.use(express.json());

// --- INVENTARIO & TRASPASOS SEGUROS ---

// Obtener Kits de Carga
app.get('/api/inventory/kits', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT k.*, 
                   (SELECT json_agg(json_build_object('product_id', ki.product_id, 'quantity', ki.quantity, 'product_name', p.name))
                    FROM inventory_kit_items ki 
                    JOIN products p ON p.id = ki.product_id
                    WHERE ki.kit_id = k.id) as items
            FROM inventory_kits k
        `);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Guardar nuevo Kit
app.post('/api/inventory/kits', async (req, res) => {
    const { name, description, items } = req.body;
    try {
        await db.query("BEGIN");
        const r = await db.query("INSERT INTO inventory_kits (name, description) VALUES ($1, $2) RETURNING id", [name, description]);
        const kitId = r.rows[0].id;
        
        for (const item of items) {
            await db.query("INSERT INTO inventory_kit_items (kit_id, product_id, quantity) VALUES ($1, $2, $3)", [kitId, item.product_id, item.quantity]);
        }
        
        await db.query("COMMIT");
        res.json({ success: true, id: kitId });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

// Iniciar Traspaso (En Tránsito)
app.post('/api/inventory/transfer', async (req, res) => {
    const { from, to, items } = req.body;
    try {
        await db.query("BEGIN");
        
        // 1. Crear cabecera de traspaso con status 'Pendiente'
        const transRes = await db.query(`
            INSERT INTO inventory_transfers (from_warehouse_id, to_warehouse_id, status, created_at)
            VALUES ($1, $2, 'Pendiente', NOW()) RETURNING id
        `, [from, to]);
        const transferId = transRes.rows[0].id;

        for (const item of items) {
            // 2. Descontar de Origen inmediatamente (Stock bloqueado)
            await db.query(`
                UPDATE warehouse_stock SET stock = stock - $1 
                WHERE warehouse_id = $2 AND product_id = $3
            `, [item.quantity, from, item.product_id]);

            // 3. Registrar items del traspaso
            await db.query(`
                INSERT INTO inventory_transfer_items (transfer_id, product_id, quantity)
                VALUES ($1, $2, $3)
            `, [transferId, item.product_id, item.quantity]);
        }

        await db.query("COMMIT");
        res.json({ success: true, transfer_id: transferId });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

// Obtener Traspasos Pendientes para un Almacén
app.get('/api/inventory/transfers/pending/:warehouse_id', async (req, res) => {
    const { warehouse_id } = req.params;
    try {
        const r = await db.query(`
            SELECT t.*, w.name as from_name,
                   (SELECT json_agg(json_build_object('product_id', ti.product_id, 'quantity', ti.quantity, 'name', p.name))
                    FROM inventory_transfer_items ti
                    JOIN products p ON p.id = ti.product_id
                    WHERE ti.transfer_id = t.id) as items
            FROM inventory_transfers t
            JOIN warehouses w ON w.id = t.from_warehouse_id
            WHERE t.to_warehouse_id = $1 AND t.status = 'Pendiente'
        `, [warehouse_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Confirmar Recepción de Traspaso
app.post('/api/inventory/transfers/:id/confirm', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("BEGIN");
        
        // 1. Obtener items del traspaso
        const itemsRes = await db.query("SELECT * FROM inventory_transfer_items WHERE transfer_id = $1", [id]);
        const transferRes = await db.query("SELECT * FROM inventory_transfers WHERE id = $1", [id]);
        const transfer = transferRes.rows[0];

        if (!transfer || transfer.status !== 'Pendiente') throw new Error("Traspaso no válido o ya procesado.");

        for (const item of itemsRes.rows) {
            // 2. Sumar al stock del Destino
            await db.query(`
                INSERT INTO warehouse_stock (warehouse_id, product_id, stock) 
                VALUES ($1, $2, $3)
                ON CONFLICT (warehouse_id, product_id) 
                DO UPDATE SET stock = warehouse_stock.stock + $3
            `, [transfer.to_warehouse_id, item.product_id, item.quantity]);
        }

        // 3. Marcar como Completado
        await db.query("UPDATE inventory_transfers SET status = 'Completado', completed_at = NOW() WHERE id = $1", [id]);

        await db.query("COMMIT");
        res.json({ success: true });
    } catch (e) { 
        await db.query("ROLLBACK");
        res.status(500).json({ error: e.message }); 
    }
});

// --- INVENTARIO AVANZADO ---

app.get('/api/inventory/lookup/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const r = await db.query("SELECT * FROM products WHERE code = $1", [code]);
        if (r.rows.length === 0) return res.status(404).json({ error: "SKU no encontrado." });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.post('/api/inventory/adjust', async (req, res) => {
    const { product_id, warehouse_id, quantity, type, reason } = req.body;
    try {
        const sign = (type === 'Salida' || type === 'Merma') ? -1 : 1;
        const adjustedQty = Number(quantity) * sign;
        await db.query("BEGIN");
        await db.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [adjustedQty, product_id]);
        await db.query(`
            INSERT INTO warehouse_stock (product_id, warehouse_id, stock) 
            VALUES ($1, $2, $3)
            ON CONFLICT (product_id, warehouse_id) 
            DO UPDATE SET stock = warehouse_stock.stock + $3
        `, [product_id, warehouse_id, adjustedQty]);
        await db.query(`
            INSERT INTO inventory_movements (product_id, warehouse_id, type, quantity, reason, user_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [product_id, warehouse_id, type, quantity, reason, 1]);
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
                commission: profit * 0.10
            };
        });
        res.json(enrichedOrders);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.post('/api/orders/:id/close-technical', async (req, res) => {
    const { id } = req.params;
    const { evidenceUrl } = req.body;
    try {
        if (!evidenceUrl) throw new Error("Se requiere la URL de la evidencia fotográfica.");
        await db.query("UPDATE orders SET evidence_url = $1, technical_closed_at = NOW() WHERE id = $2", [evidenceUrl, id]);
        res.json({ success: true, message: "Evidencia registrada. Orden lista para auditoría final." });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3000, () => console.log('🚀 SuperAir Backend running on port 3000'));
