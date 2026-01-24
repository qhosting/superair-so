import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Priorizar la variable de entorno DATABASE_URL proporcionada por el orquestador
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexiones simultáneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// --- MONITOREO DE EVENTOS DE BASE DE DATOS ---
pool.on('error', (err) => {
    console.error(`🔴 [DB CRITICAL ERROR] Pool perdió la conexión:`, err.message);
});

const getTableCount = async () => {
    try {
        const res = await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'");
        return parseInt(res.rows[0].count);
    } catch (e) {
        return 0;
    }
};

const waitAndConnect = async (retries = 15, delay = 4000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log(`🐘 Conexión exitosa con PostgreSQL.`);
            client.release();
            return true;
        } catch (err) {
            console.warn(`⏳ [DB ATTEMPT ${i + 1}/${retries}] Esperando base de datos...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    console.error(`❌ [DB FATAL] No se pudo conectar a la base de datos tras ${retries} intentos.`);
    throw new Error("❌ Error crítico: No se pudo conectar a la base de datos.");
};

export const initDatabase = async () => {
    try {
        await waitAndConnect();
        
        console.log(`🛠️ Revisando estado del esquema SuperAir...`);
        
        const beforeCount = await getTableCount();
        console.log(`📊 Tablas existentes antes de migrar: ${beforeCount}`);

        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);

        const afterCount = await getTableCount();
        console.log(`✅ Esquema sincronizado. Total de tablas: ${afterCount}`);
        
    } catch (e) {
        console.error(`❌ [DB MIGRATION ERROR]`, e.message);
    }
};

export const query = (text, params) => {
    const start = Date.now();
    return pool.query(text, params).then(res => {
        const duration = Date.now() - start;
        if (duration > 1500) {
            console.warn(`⚠️ [SLOW QUERY] ${duration}ms - ${text.substring(0, 50)}...`);
        }
        return res;
    }).catch(err => {
        console.error(`🔴 [QUERY ERROR]`, err.message);
        throw err;
    });
};

export { pool };