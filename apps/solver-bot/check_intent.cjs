const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`SELECT metadata FROM transactions WHERE tx_hash = 'eco_intent_0xd5d5c50beadcf7000f726300d307b72b9a66b4cc83e9d92b328f2e341987637b'`);
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (e) { console.error(e.message); }
  await client.end();
}
main();
