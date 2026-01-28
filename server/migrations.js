import { pool } from './db.js';

export const runMigrations = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Running Database Migrations...');

        const ensureColumn = async (table, column, type) => {
            const check = await client.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name=$1 AND column_name=$2
            `, [table, column]);

            if (check.rows.length === 0) {
                console.log(`⚠️ Adding missing column: ${column} to ${table}`);
                await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
            }
        };

        // Clients Table Migrations
        await ensureColumn('clients', 'contact_name', 'VARCHAR(255)');
        await ensureColumn('clients', 'notes', 'TEXT');
        await ensureColumn('clients', 'address', 'TEXT');
        await ensureColumn('clients', 'rfc', 'VARCHAR(15)');
        await ensureColumn('clients', 'category', "VARCHAR(20) DEFAULT 'Bronze'");

        // Orders Table Migrations
        await ensureColumn('orders', 'evidence_url', 'TEXT');

        console.log('✅ Migrations completed successfully.');
    } catch (e) {
        console.error('❌ Migration Error:', e);
    } finally {
        client.release();
    }
};
