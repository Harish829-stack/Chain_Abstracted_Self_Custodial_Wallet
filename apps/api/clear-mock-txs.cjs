const pg = require("pg");
const pool = new pg.Pool({ connectionString: "postgresql://postgres.qqlcjqqihzijsvybpfcq:Harish%402026%23%40@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres", ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query(`UPDATE transactions SET status = 'CANCELLED' WHERE status = 'PENDING' AND tx_hash LIKE 'mock_%'`);
  console.log(`Cancelled ${res.rowCount} mock transactions stuck in PENDING.`);
  process.exit(0);
}
run();
