import { pad, encodeAbiParameters, parseAbiParameters } from "viem";
import { account, publicClients, walletClients, PORTAL_ADDRESS, HYPER_PROVER_ADDRESS, PortalAbi } from "../shared.js";

export async function fulfillEVMIntent(intentRow: any, intentPayload: any) {
  const destChainId = intentPayload.destination?.toString();
  const targetPublicClient = publicClients[destChainId];
  const targetWalletClient = walletClients[destChainId];
  
  if (!targetPublicClient || !targetWalletClient) {
    throw new Error(`Unsupported EVM destination chain: ${destChainId}`);
  }

  console.log(`✅ Preparing fulfillment on EVM Chain ID: ${destChainId}...`);
  
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
  const extraGas = 100000000000000000n; // 0.1 native token
  
  const sourceDomainID = BigInt(intentRow.chain_id);

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
  
  console.log(`⏳ Waiting for EVM fulfillment receipt: ${txHash}`);
  await targetPublicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`🏦 Settlement complete on EVM destination chain!`);
}
