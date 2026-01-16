
// ... (mismos imports anteriores) ...

// Nuevo Endpoint: Importación Masiva
app.post('/api/products/bulk', async (req, res) => {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: "Invalid data format" });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const results = [];

        for (const p of products) {
            const r = await client.query(`
                INSERT INTO products (code, name, description, price, cost, stock, min_stock, category, type, unit_of_measure)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (code) DO UPDATE SET 
                    name = EXCLUDED.name,
                    price = EXCLUDED.price,
                    cost = EXCLUDED.cost,
                    stock = products.stock + EXCLUDED.stock,
                    category = EXCLUDED.category
                RETURNING id
            `, [p.code, p.name, p.description, p.price, p.cost, p.stock || 0, p.min_stock || 5, p.category, p.type || 'product', p.unit_of_measure || 'Pza']);
            
            // Asegurar que el stock se refleje en el almacén central (ID: 1)
            await client.query(`
                INSERT INTO inventory_levels (warehouse_id, product_id, stock)
                VALUES (1, $1, $2)
                ON CONFLICT (warehouse_id, product_id) 
                DO UPDATE SET stock = inventory_levels.stock + $2
            `, [r.rows[0].id, p.stock || 0]);

            results.push(r.rows[0].id);
        }

        await client.query('COMMIT');
        res.json({ success: true, imported: results.length });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ... (resto de los endpoints existentes) ...
app.listen(3000, () => console.log(`🚀 SuperAir Engine Live on port 3000`));
