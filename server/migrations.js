import { pool } from './db.js';

export const runMigrations = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Running Database Migrations...');

        // 1. Ensure 'clients' table has 'contact_name'
        const checkContactName = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='clients' AND column_name='contact_name'
        `);

        if (checkContactName.rows.length === 0) {
            console.log('⚠️ Adding missing column: contact_name to clients');
            await client.query("ALTER TABLE clients ADD COLUMN contact_name VARCHAR(255)");
        }

        // 2. Ensure 'orders' has 'evidence_url'
        const checkEvidence = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' AND column_name='evidence_url'
        `);

        if (checkEvidence.rows.length === 0) {
             console.log('⚠️ Adding missing column: evidence_url to orders');
             await client.query("ALTER TABLE orders ADD COLUMN evidence_url TEXT");
        }

        console.log('✅ Migrations completed successfully.');
    } catch (e) {
        console.error('❌ Migration Error:', e);
    } finally {
        client.release();
    }
};
