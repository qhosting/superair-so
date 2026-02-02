
import * as db from './db.js';

async function diagnose() {
    try {
        await db.initDatabase();

        console.log("Checking columns in 'clients' table...");
        const res = await db.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'clients'
        `);

        console.log("Columns found:", res.rows);

        const contactNameExists = res.rows.some(r => r.column_name === 'contact_name');
        if (!contactNameExists) {
            console.error("❌ CRITICAL: 'contact_name' column is MISSING in the running database!");
        } else {
            console.log("✅ 'contact_name' column exists.");
        }

    } catch (e) {
        console.error("Diagnosis failed:", e);
    }
    process.exit(0);
}

diagnose();
