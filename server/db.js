
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Priorizar la variable de entorno DATABASE_URL proporcionada por el orquestador
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:a4ed1d692598e800cc42@qhosting_odoo-superairdb:5432/qhosting?sslmode=disable';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const waitAndConnect = async (retries = 15, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log("🐘 Conectado exitosamente a PostgreSQL.");
            client.release();
            return true;
        } catch (err) {
            console.warn(`⏳ [Intento ${i + 1}/${retries}] Esperando base de datos... (${err.message})`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error("❌ Error crítico: No se pudo conectar a la base de datos.");
};

export const initDatabase = async () => {
    try {
        await waitAndConnect();
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log("✅ Esquema de base de datos sincronizado.");
    } catch (e) {
        console.error("❌ Error en migración:", e.message);
    }
};

export const query = (text, params) => pool.query(text, params);
export { pool };
