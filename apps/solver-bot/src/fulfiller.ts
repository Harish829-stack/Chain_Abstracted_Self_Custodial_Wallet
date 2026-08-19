import { pad, encodeAbiParameters, parseAbiParameters } from "viem";
import { pool, account, publicClients, walletClients, PORTAL_ADDRESS, HYPER_PROVER_ADDRESS, PortalAbi } from "./shared.js";

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
        const destChainId = intentPayload.destination?.toString();
        const targetPublicClient = publicClients[destChainId];
        const targetWalletClient = walletClients[destChainId];
        
        if (!targetPublicClient || !targetWalletClient) {
          console.log(`❌ Unsupported destination chain: ${destChainId}`);
          await pool.query(`UPDATE transactions SET status = 'FAILED' WHERE id = $1`, [intentRow.id]);
          continue;
        }

        console.log(`✅ Preparing fulfillment on Chain ID: ${destChainId}...`);
        
        const getIntentHashAbi = PortalAbi.filter(
          (item: any) => item.name === "getIntentHash" && item.inputs.length === 1
        );

        const hashes = await targetPublicClient.readContract({
          address: PORTAL_ADDRESS as `0x${string}`,
          abi: getIntentHashAbi,
          functionName: "getIntentHash",
          args: [intentPayload]
        }) as [string, string, string];
        
        const intentHash = hashes[0];
        const rewardHash = hashes[2];
        console.log(`📝 Hash computed: ${intentHash}. Broadcasting fulfillAndProve...`);
        
        const claimantBytes32 = pad(account!.address, { size: 32 });
        // Overpay the Hyperlane IGP fee to ensure it covers dynamic bridge costs (excess is automatically refunded)
        const extraGas = 100000000000000000n; // 0.1 native token
        
        // Extract source domain ID from the database record (it is the Chain ID where the intent was created)
        const sourceDomainID = BigInt(intentRow.chain_id);

        // Properly encode the UnpackedData struct for HyperProver
        // IMPORTANT: Because UnpackedData is a struct, it must be encoded as a single tuple \`(bytes32, bytes, address)\`
        // rather than 3 separate parameters \`bytes32, bytes, address\`.
        const encodedData = encodeAbiParameters(
          parseAbiParameters('(bytes32, bytes, address)'),
          [[
            pad(HYPER_PROVER_ADDRESS, { size: 32 }), // sourceChainProver
            "0x",                                    // metadata
            "0x0000000000000000000000000000000000000000" // hookAddr
          ]]
        );

        const txHash = await targetWalletClient.writeContract({
          address: PORTAL_ADDRESS as `0x${string}`,
          abi: PortalAbi,
          functionName: "fulfillAndProve",
          args: [intentHash, intentPayload.route, rewardHash, claimantBytes32, HYPER_PROVER_ADDRESS, sourceDomainID, encodedData],
          value: (BigInt(intentPayload.route.nativeAmount) + extraGas)
        });
        
        console.log(`⏳ Waiting for fulfillment receipt: ${txHash}`);
        await targetPublicClient.waitForTransactionReceipt({ hash: txHash });
        console.log(`🏦 Settlement complete on destination chain!`);
        
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
