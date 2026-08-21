import { pool, account } from "./shared.js";
import { fulfillEVMIntent } from "./strategies/EVMFulfiller.js";
import { fulfillSVMIntent } from "./strategies/SVMFulfiller.js";

console.log("🚀 Starting Eco Routes Fulfiller Bot...");
console.log(`MODE: ${account ? "LIVE (On-Chain)" : "Mock (Database Polling)"}`);
if (account) console.log(`WALLET: ${account.address}`);
console.log("-----------------------------------------");

const processingIntents = new Set<string>();

async function pollForIntents() {
  try {
    const result = await pool.query(`
      SELECT * FROM transactions 
      WHERE (status = 'PENDING' OR status = 'CONFIRMED') AND tx_hash LIKE 'eco_intent_%'
    `);
    
    for (const intentRow of result.rows) {
      if (processingIntents.has(intentRow.tx_hash)) continue;
      processingIntents.add(intentRow.tx_hash);

      console.log(`\n🚨 New Intent Detected: ${intentRow.tx_hash}`);
      
      const intentPayload = intentRow.metadata?.intent;
      if (!intentPayload) {
        console.log("❌ Intent missing metadata payload. Skipping.");
        await pool.query(`UPDATE transactions SET status = 'FAILED' WHERE id = $1`, [intentRow.id]);
        continue;
      }

      try {
        const intentEnvelope = intentRow.metadata?.intent;
        
        // Handle generic envelope if it exists, otherwise assume legacy EVM payload
        const vmType = intentEnvelope?.vmType || "EVM";
        const actualPayload = intentEnvelope?.payload || intentEnvelope;

        if (vmType === "SVM") {
          await fulfillSVMIntent(intentRow, actualPayload);
        } else {
          await fulfillEVMIntent(intentRow, actualPayload);
        }
        
        // Update DB to wait for claim
        await pool.query(`UPDATE transactions SET status = 'PROVEN_PENDING' WHERE id = $1`, [intentRow.id]);
        console.log(`✅ Marked intent as PROVEN_PENDING.`);
      } catch (innerError: any) {
        console.log(`❌ Fulfillment failed: ${innerError.message || innerError}`);
        if (innerError.message && innerError.message.includes("IntentAlreadyFulfilled")) {
           await pool.query(`UPDATE transactions SET status = 'PROVEN_PENDING' WHERE id = $1`, [intentRow.id]);
        } else if (innerError.message && innerError.message.includes("IntentExpired")) {
           await pool.query(`UPDATE transactions SET status = 'EXPIRED' WHERE id = $1`, [intentRow.id]);
        } else {
           // For any other unexpected contract reverts that are permanent, we probably want to mark as FAILED
           // But let's at least mark it FAILED to prevent infinite loops on unrecoverable reverts
           await pool.query(`UPDATE transactions SET status = 'FAILED' WHERE id = $1`, [intentRow.id]);
        }
      } finally {
        processingIntents.delete(intentRow.tx_hash);
      }
    }
  } catch (error) {
    console.error("Error polling for intents:", error);
  }
}

// Run Fulfillment poll every 3 seconds
setInterval(pollForIntents, 3000);
