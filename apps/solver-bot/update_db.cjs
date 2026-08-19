const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'PROVEN_PENDING'`);
    console.log("Added PROVEN_PENDING");
  } catch (e) { console.error(e.message); }
  try {
    await client.query(`ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'CLAIMED'`);
    console.log("Added CLAIMED");
  } catch (e) { console.error(e.message); }
  
  // also set the already fulfilled intent to PROVEN_PENDING so it stops reverting
  try {
    const res = await client.query(`UPDATE transactions SET status = 'PROVEN_PENDING' WHERE status = 'PENDING'`);
    console.log("Updated", res.rowCount, "pending intents to PROVEN_PENDING");
  } catch (e) { console.error(e.message); }

  await client.end();
}
main();
