import { createPublicClient, http, pad } from "viem";
import { polygonAmoy } from "viem/chains";
import fs from "fs";
import pg from "pg";

const PORTAL_ADDRESS = "0x154115F055A5Ff2584ABcB013C6832F19F0D8bc5";
const solverAddress = "0x878344AF84A404439Ea37cFB9b30DeFd7938741C"; // The user's solver address

const PortalAbi = JSON.parse(fs.readFileSync("./src/PortalAbi.json", "utf8"));
const publicClient = createPublicClient({ chain: polygonAmoy, transport: http() });

const pool = new pg.Pool({ connectionString: "postgresql://postgres.qqlcjqqihzijsvybpfcq:Harish%402026%23%40@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres", ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query("SELECT * FROM transactions WHERE status = 'PENDING' AND tx_hash LIKE 'eco_intent_%' ORDER BY created_at DESC LIMIT 1");
  if (result.rows.length === 0) return console.log("No pending intent");
  
  const intentPayload = result.rows[0].metadata.intent;
  console.log("Simulating intent:", result.rows[0].tx_hash);
  
  const getIntentHashAbi = PortalAbi.filter((item) => item.name === "getIntentHash" && item.inputs.length === 1);
  const hashes = await publicClient.readContract({
    address: PORTAL_ADDRESS,
    abi: getIntentHashAbi,
    functionName: "getIntentHash",
    args: [intentPayload]
  });
  
  const claimantBytes32 = pad(solverAddress, { size: 32 });
  
  try {
    await publicClient.simulateContract({
      account: solverAddress,
      address: PORTAL_ADDRESS,
      abi: PortalAbi,
      functionName: "fulfill",
      args: [hashes[0], intentPayload.route, hashes[2], claimantBytes32],
      value: BigInt(intentPayload.route.nativeAmount)
    });
    console.log("Simulation SUCCESS!");
  } catch (err) {
    console.log("Simulation FAILED:", err.shortMessage || err.message);
    if (err.cause) console.log("Cause:", err.cause.message);
    if (err.cause?.data) console.log("Data:", err.cause.data);
  }
  process.exit(0);
}
run();
