const pg = require("pg");
const pool = new pg.Pool({ connectionString: "postgresql://postgres.qqlcjqqihzijsvybpfcq:Harish%402026%23%40@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres", ssl: { rejectUnauthorized: false } });

async function run() {
  await pool.query("UPDATE transactions SET status = 'CONFIRMED' WHERE tx_hash = 'eco_intent_0x771377e5bc086911e4635e9bd1e930531c2ab8089c4399e9dc3e0ffec508cee4'");
  console.log("Updated DB");
  process.exit(0);
}
run();
