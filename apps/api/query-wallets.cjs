const pg = require("pg");
const pool = new pg.Pool({ connectionString: "postgresql://postgres.qqlcjqqihzijsvybpfcq:Harish%402026%23%40@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres", ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query("SELECT address, vm FROM wallet_addresses");
  console.log("Addresses in DB:");
  res.rows.forEach(r => console.log(r.address, r.vm));
  process.exit(0);
}
run();
