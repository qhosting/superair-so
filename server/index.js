
import express from 'express';
import * as db from './db.js';
import { sendWhatsApp } from './services.js';

const app = express();
app.use(express.json());

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

// ... (Resto de endpoints previos)
