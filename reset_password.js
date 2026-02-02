
import { pool } from './server/db.js';
import bcrypt from 'bcryptjs';

async function resetAdmin() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query("UPDATE users SET password = $1 WHERE email = 'admin@superair.com.mx'", [hashedPassword]);
    console.log("Password reset");
    process.exit(0);
}

resetAdmin();
