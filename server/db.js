
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

/**
 * Espera a que la base de datos esté disponible antes de proceder.
 * Útil para despliegues en Docker donde los servicios inician en paralelo.
 */
const waitAndConnect = async (retries = 10, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log("🐘 Conexión exitosa con PostgreSQL.");
            client.release();
            return true;
        } catch (err) {
            console.warn(`⏳ [Intento ${i + 1}/${retries}] Esperando a la base de datos... (${err.message})`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error("❌ No se pudo conectar a la base de datos tras múltiples intentos.");
};

export const initDatabase = async () => {
    try {
        await waitAndConnect();
        
        console.log("🛠️ Revisando estado del esquema SuperAir...");
        
        // Contar tablas actuales
        const preCheck = await pool.query(`
            SELECT count(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`📊 Tablas existentes antes de migrar: ${preCheck.rows[0].count}`);

        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        
        const postCheck = await pool.query(`
            SELECT count(*) FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`✅ Esquema sincronizado. Total de tablas: ${postCheck.rows[0].count}`);
        
    } catch (e) {
        console.error("❌ Error crítico en migración de base de datos:", e.message);
        // En producción, podrías querer cerrar el proceso si la DB no es válida
        // process.exit(1);
    }
};

export const query = (text, params) => pool.query(text, params);
export { pool };
