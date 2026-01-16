
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:a4ed1d692598e800cc42@qhosting_odoo-superairdb:5432/qhosting?sslmode=disable';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const initDatabase = async () => {
    try {
        console.log("🛠️ Inicializando Esquema de Base de Datos...");
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log("✅ Tablas persistentes creadas correctamente.");
    } catch (e) {
        console.error("❌ Error inicializando base de datos:", e.message);
    }
};

export const query = (text, params) => pool.query(text, params);
export { pool };
