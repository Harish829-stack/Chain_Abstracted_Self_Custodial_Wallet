import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
// We assume the IDL is placed here after the SVM programs are built
import PortalIdl from "../../../../eco-routes-svm/target/idl/portal.json" assert { type: "json" };

export async function fulfillSVMIntent(intentRow: any, intentPayload: any) {
  // 1. Setup Solana Connection and Wallet
  const solanaRpcUrl = process.env.SOLANA_RPC_URL;
  const privateKeyString = process.env.PRIVATE_KEY; // Base58 encoded Solana Private Key or EVM depending on what user provided

  if (!solanaRpcUrl) throw new Error("Missing SOLANA_RPC_URL in env");
  if (!privateKeyString) throw new Error("Missing PRIVATE_KEY in env");

  const connection = new Connection(solanaRpcUrl, "confirmed");
  
  // NOTE: For a real cross-VM bot, you might have separate EVM_PRIVATE_KEY and SVM_PRIVATE_KEY
  // Assuming privateKeyString is a base58 encoded array for Solana for now
  const bs58 = (await import("bs58")).default;
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyString));
  const wallet = new Wallet(keypair);

  const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
  
  // The Portal Program ID
  const PORTAL_PROGRAM_ID = new PublicKey("EcooiHrTiMnfUBMw297gvPwX55HD8SCxA61tBBLV3yaV");
  
  // @ts-ignore - IDL types will be strictly enforced once generated
  const program = new Program(PortalIdl, PORTAL_PROGRAM_ID, provider);

  console.log(`✅ Preparing fulfillment on SVM (Solana Devnet)...`);

  // 2. Parse the payload
  const { intentHash, route, rewardHash, claimant } = intentPayload;
  
  // Ensure claimant is a 32-byte array (Solana PublicKey bytes)
  const claimantBytes = Array.from(keypair.publicKey.toBytes());

  // 3. Construct the Fulfill Instruction
  try {
    const tx = await program.methods
      .fulfill({
        intentHash: Array.from(Buffer.from(intentHash.replace('0x', ''), 'hex')),
        route: route, // Must match the Anchor IDL Route struct
        rewardHash: Array.from(Buffer.from(rewardHash.replace('0x', ''), 'hex')),
        claimant: claimantBytes,
      })
      .accounts({
        payer: keypair.publicKey,
        solver: keypair.publicKey,
        // The remaining accounts (executor PDA, fulfill marker PDA, token programs) 
        // need to be derived and passed in according to the IDL
        executor: PublicKey.findProgramAddressSync([Buffer.from("executor")], PORTAL_PROGRAM_ID)[0],
        fulfillMarker: PublicKey.findProgramAddressSync([
           Buffer.from("fulfill_marker"), 
           Buffer.from(intentHash.replace('0x', ''), 'hex')
        ], PORTAL_PROGRAM_ID)[0],
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        token2022Program: new PublicKey("TokenzQdBNbLqP5VEhfqASPWvWb2B9kG23gK2M2gUe8"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: new PublicKey("11111111111111111111111111111111"),
      })
      .rpc();

    console.log(`⏳ Waiting for SVM fulfillment receipt: ${tx}`);
    console.log(`🏦 Settlement complete on Solana!`);
  } catch (error) {
    console.error(`❌ SVM Fulfillment failed:`, error);
    throw error;
  }
}
