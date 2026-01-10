import pg from 'pg';
const { Pool } = pg;

// Prioritize Env Var, fallback to provided internal URL
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:a4ed1d692598e800cc42@qhosting_odoo-superairdb:5432/qhosting?sslmode=disable';

console.log('🔌 Connecting to Database...');

// Determine SSL setting based on connection string or environment
// Production databases often require SSL with rejectUnauthorized: false
let sslConfig = false;

if (process.env.NODE_ENV === 'production' && !connectionString.includes('sslmode=disable')) {
  sslConfig = { rejectUnauthorized: false };
}

const poolConfig = {
  connectionString,
  ssl: sslConfig,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Fatal Database Error:', err.message);
});

export const checkConnection = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as now');
    console.log(`✅ [PROD] Base de Datos Conectada:`, res.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ [PROD] Error Crítico: No se pudo conectar a PostgreSQL.', err);
    console.error('   Hint: Verifique credenciales o firewall.');
    return false;
  }
};

export const query = async (text, params) => {
  return pool.query(text, params);
};

export { pool };