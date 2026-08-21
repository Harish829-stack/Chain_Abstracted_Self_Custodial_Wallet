import { pool } from "./shared.js";
import { claimEVMIntent } from "./strategies/EVMClaimer.js";
import { claimSVMIntent } from "./strategies/SVMClaimer.js";

console.log("🚀 Starting Eco Routes Claimer Bot...");
console.log("-----------------------------------------");

const processingClaims = new Set<string>();

async function pollForClaims() {
  try {
    const result = await pool.query(`
      SELECT * FROM transactions 
      WHERE status = 'PROVEN_PENDING'
    `);

    if (result.rows.length > 0) {
      console.log(`\n🔍 Checking ${result.rows.length} pending claims...`);
    }

    for (const claimRow of result.rows) {
      if (processingClaims.has(claimRow.tx_hash)) continue;
      processingClaims.add(claimRow.tx_hash);

      const intentPayload = claimRow.metadata?.intent;
      if (!intentPayload) continue;

      try {
        const intentEnvelope = claimRow.metadata?.intent;
        
        // Handle generic envelope if it exists, otherwise assume legacy EVM payload
        const vmType = intentEnvelope?.vmType || "EVM";
        const actualPayload = intentEnvelope?.payload || intentEnvelope;

        let claimed = false;
        if (vmType === "SVM") {
          claimed = await claimSVMIntent(claimRow, actualPayload);
        } else {
          claimed = await claimEVMIntent(claimRow, actualPayload);
        }

        if (claimed) {
          await pool.query(`UPDATE transactions SET status = 'CLAIMED' WHERE id = $1`, [claimRow.id]);
        }
      } catch (err: any) {
        console.log(`⚠️ Claim polling error: ${err.message || err}`);
        if (err.message && err.message.includes("IntentAlreadyWithdrawn")) {
           await pool.query(`UPDATE transactions SET status = 'CLAIMED' WHERE id = $1`, [claimRow.id]);
        }
      } finally {
        processingClaims.delete(claimRow.tx_hash);
      }
    }
  } catch (error) {
    console.error("Error polling for claims:", error);
  }
}

// Run once immediately on startup
pollForClaims();

// Run Claim poll every 5 seconds
setInterval(pollForClaims, 5000);
