
// Módulo de conexión a Base de Datos Postgres
// Se utiliza para conectar el sistema a la instancia externa proporcionada

import pg from 'pg';
const { Pool } = pg;

// Configuración de la conexión utilizando la URL proporcionada
// NOTA: Para Easypanel, es recomendable usar process.env.DATABASE_URL
// pero aquí usamos el valor por defecto para asegurar funcionamiento inmediato.
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:a4ed1d692598e800cc42@qhosting_odoo-superairdb:5432/qhosting?sslmode=disable';

const pool = new Pool({
  connectionString,
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en cliente inactivo de Postgres', err);
  process.exit(-1);
});

// Función de prueba de conexión
export const checkConnection = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Conexión a Base de Datos Postgres exitosa:', res.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Error conectando a Base de Datos:', err.message);
    return false;
  }
};

export const query = (text, params) => pool.query(text, params);
export { pool };
