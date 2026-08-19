const pg = require("pg");
const pool = new pg.Pool({ connectionString: "postgresql://postgres.qqlcjqqihzijsvybpfcq:Harish%402026%23%40@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres", ssl: { rejectUnauthorized: false } });

async function run() {
  await pool.query("UPDATE transactions SET status = 'CANCELLED' WHERE tx_hash = 'eco_intent_0x09a5473fdc9ba1f0882264bf89b9c8f097f6c07fa8d052c567044a851a1afe67'");
  console.log("Updated DB for spam intent");
  process.exit(0);
}
run();
