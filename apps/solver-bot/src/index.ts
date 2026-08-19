import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createWalletClient, createPublicClient, http, pad, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy, sepolia, arbitrumSepolia } from "viem/chains";

import PortalAbi from "./PortalAbi.json" assert { type: "json" };
import HyperProverAbi from "./HyperProverAbiOnly.json" assert { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../../../eco-solver/.env") });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// Unified addresses for all EVM chains
const PORTAL_ADDRESS = "0x154115F055A5Ff2584ABcB013C6832F19F0D8bc5";
const HYPER_PROVER_ADDRESS = "0x3d2D283731a900547Ef065057dBf704B6fec19C7";

const solverPrivateKey = process.env.SOLVER_PRIVATE_KEY;

if (!solverPrivateKey) {
  console.warn("⚠️ SOLVER_PRIVATE_KEY not set in .env! Cannot execute real fulfillments.");
}

const account = solverPrivateKey ? privateKeyToAccount(
  solverPrivateKey.startsWith("0x") ? (solverPrivateKey as `0x${string}`) : `0x${solverPrivateKey}`
) : null;

const publicClients: Record<string, any> = {
  "80002": createPublicClient({ chain: polygonAmoy, transport: http(process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/") }),
  "11155111": createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org") }),
  "421614": createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc") })
};

const walletClients: Record<string, any> = {
  "80002": account ? createWalletClient({ account, chain: polygonAmoy, transport: http(process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/") }) : null,
  "11155111": account ? createWalletClient({ account, chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org") }) : null,
  "421614": account ? createWalletClient({ account, chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc") }) : null
};

console.log("🚀 Starting Eco Routes Solver Bot...");
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
        // IMPORTANT: Because UnpackedData is a struct, it must be encoded as a single tuple `(bytes32, bytes, address)`
        // rather than 3 separate parameters `bytes32, bytes, address`.
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

// ACTION C: Claim Polling Loop
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
        } else {
          console.log(`⏳ Proof for ${claimRow.tx_hash} hasn't arrived on Source Chain yet. Checking again in 60s...`);
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

// Run Fulfillment poll every 3 seconds
setInterval(pollForIntents, 3000);

// Run Claim poll every 60 seconds (user requested 1 min)
setInterval(pollForClaims, 60000);
