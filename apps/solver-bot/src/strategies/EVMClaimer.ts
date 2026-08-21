import { publicClients, walletClients, PORTAL_ADDRESS, HYPER_PROVER_ADDRESS, PortalAbi, HyperProverAbi } from "../shared.js";

export async function claimEVMIntent(claimRow: any, intentPayload: any) {
  const sourceChainId = claimRow.chain_id.toString(); // Source chain where intent was originally created

  const sourcePublicClient = publicClients[sourceChainId];
  const sourceWalletClient = walletClients[sourceChainId];

  if (!sourcePublicClient || !sourceWalletClient) {
    throw new Error(`Unsupported EVM source chain: ${sourceChainId}`);
  }

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

  const claimantAddress = proof.claimant || proof[0]; // Viem decodes tuples with named components as objects
  
  if (claimantAddress && claimantAddress.toLowerCase() !== "0x0000000000000000000000000000000000000000") {
    console.log(`\n🎉 Proof arrived for ${claimRow.tx_hash}! Executing claim on EVM Source Chain...`);
    
    const txHash = await sourceWalletClient.writeContract({
      address: PORTAL_ADDRESS as `0x${string}`,
      abi: PortalAbi,
      functionName: "withdraw",
      args: [intentPayload.destination, hashes[1], intentPayload.reward]
    });

    console.log(`⏳ Waiting for claim receipt: ${txHash}`);
    await sourcePublicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`💰 Reward claimed successfully on EVM!`);
    
    return true; // Claim successful
  } else {
    console.log(`[EVM] Proof for intent ${intentHash} hasn't arrived on Source Chain yet.`);
  }
  
  return false; // Not ready to claim
}
