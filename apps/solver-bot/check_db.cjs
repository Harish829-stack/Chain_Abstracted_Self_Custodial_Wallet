const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`SELECT metadata FROM transactions WHERE tx_hash = 'eco_intent_0x1352bd179323fa6ce0c8b7f6cb5f67dd619e17c3eb063f3a45f84dfbc9396e38'`);
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (e) { console.error(e.message); }
  await client.end();
}
main();
