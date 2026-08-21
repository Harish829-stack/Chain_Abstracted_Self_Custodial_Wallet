import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/solver-bot/.env' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const res = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5');
console.log(JSON.stringify(res.rows, null, 2));
pool.end();
