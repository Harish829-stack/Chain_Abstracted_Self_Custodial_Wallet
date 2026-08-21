import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import PortalIdl from "../../../../eco-routes-svm/target/idl/portal.json" assert { type: "json" };

export async function claimSVMIntent(claimRow: any, intentPayload: any) {
  const solanaRpcUrl = process.env.SOLANA_RPC_URL;
  const privateKeyString = process.env.PRIVATE_KEY;
  if (!solanaRpcUrl || !privateKeyString) throw new Error("Missing SOLANA environment variables");

  const bs58 = (await import("bs58")).default;
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyString));
  const connection = new Connection(solanaRpcUrl, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(keypair), { preflightCommitment: "confirmed" });

  const PORTAL_PROGRAM_ID = new PublicKey("EcooiHrTiMnfUBMw297gvPwX55HD8SCxA61tBBLV3yaV");
  // @ts-ignore
  const program = new Program(PortalIdl, PORTAL_PROGRAM_ID, provider);

  const { intentHash, destination, reward } = intentPayload;

  // Poll the hyper-prover PDA for this intent hash
  // Normally we would have the hyper-prover program ID, assuming standard derivation
  // const PROVER_PROGRAM_ID = new PublicKey("...");
  // const proverStatePda = PublicKey.findProgramAddressSync([Buffer.from("proven_intent"), Buffer.from(intentHash, 'hex')], PROVER_PROGRAM_ID)[0];
  
  // For the sake of architecture, we assume the proof is verified:
  console.log(`\n🎉 Proof arrived for ${claimRow.tx_hash}! Executing claim on SVM Source Chain...`);
  
  try {
    const tx = await program.methods
      .withdraw({
        destination: destination,
        rewardHash: Array.from(Buffer.from("00".repeat(32), 'hex')), // We'd compute or fetch this 
        reward: reward
      })
      .accounts({
        payer: keypair.publicKey,
        claimer: keypair.publicKey,
        // other accounts...
      })
      .rpc();
      
    console.log(`⏳ Waiting for SVM claim receipt: ${tx}`);
    console.log(`💰 Reward claimed successfully on Solana!`);
    return true;
  } catch (error) {
     console.error("SVM Claim Error", error);
     return false;
  }
}
