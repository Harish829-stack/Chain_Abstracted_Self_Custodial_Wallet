const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`SELECT tx_hash, status, metadata FROM transactions ORDER BY created_at DESC LIMIT 5`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) { console.error(e.message); }
  await client.end();
}
main();
