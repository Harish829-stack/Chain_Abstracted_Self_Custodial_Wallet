import { pool, publicClients, walletClients, PORTAL_ADDRESS, HYPER_PROVER_ADDRESS, PortalAbi, HyperProverAbi } from "./shared.js";

console.log("🚀 Starting Eco Routes Claimer Bot...");
console.log("-----------------------------------------");

const processingClaims = new Set<string>();

async function pollForClaims() {
  try {
    const result = await pool.query(`
      SELECT * FROM transactions 
      WHERE status = 'PROVEN_PENDING'
    `);

    for (const claimRow of result.rows) {
      if (processingClaims.has(claimRow.tx_hash)) continue;
      processingClaims.add(claimRow.tx_hash);

      const intentPayload = claimRow.metadata?.intent;
      if (!intentPayload) continue;

      try {
        const sourceChainId = claimRow.chain_id.toString(); // Source chain where intent was originally created

        const sourcePublicClient = publicClients[sourceChainId];
        const sourceWalletClient = walletClients[sourceChainId];

        if (!sourcePublicClient || !sourceWalletClient) continue;

        const getIntentHashAbi = PortalAbi.filter(
          (item: any) => item.name === "getIntentHash" && item.inputs.length === 1
        );

        const hashes = await sourcePublicClient.readContract({
          address: PORTAL_ADDRESS as `0x${string}`,
          abi: getIntentHashAbi,
          functionName: "getIntentHash",
          args: [intentPayload]
        }) as [string, string, string];

        const intentHash = hashes[0];

        // Check if proof has arrived via HyperProver
        const proof = await sourcePublicClient.readContract({
          address: HYPER_PROVER_ADDRESS as `0x${string}`,
          abi: HyperProverAbi,
          functionName: "provenIntents",
          args: [intentHash]
        }) as any;

        const claimantAddress = proof[0]; // provenIntents returns a ProofData struct [claimant, destination]
        
        if (claimantAddress && claimantAddress.toLowerCase() !== "0x0000000000000000000000000000000000000000") {
          console.log(`\n🎉 Proof arrived for ${claimRow.tx_hash}! Executing claim on Source Chain...`);
          
          const txHash = await sourceWalletClient.writeContract({
            address: PORTAL_ADDRESS as `0x${string}`,
            abi: PortalAbi,
            functionName: "withdraw",
            args: [intentPayload.destination, hashes[1], intentPayload.reward]
          });

          console.log(`⏳ Waiting for claim receipt: ${txHash}`);
          await sourcePublicClient.waitForTransactionReceipt({ hash: txHash });
          console.log(`💰 Reward claimed successfully!`);

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

// Run Claim poll every 60 seconds (user requested 1 min)
setInterval(pollForClaims, 60000);
