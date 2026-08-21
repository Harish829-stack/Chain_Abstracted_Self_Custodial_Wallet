import { createPublicClient, http, parseAbiParameters, encodeAbiParameters, pad } from 'viem';
import { sepolia } from 'viem/chains';
const targetPublicClient = createPublicClient({ chain: sepolia, transport: http("https://sepolia.infura.io/v3/86b7c03e8d49460ca30a6845f81a6c80") });
const PORTAL_ADDRESS = "0x684fBb731F21083f0f0d32f9d1625938a1008887";
const HYPER_PROVER_ADDRESS = "0xE36F117A981a39195C93Bb78e821caCF23CC88fe";
const intentPayload = {
  route: {
    salt: "0xbd0596bc5fb118fb5b89e6f502fa322d98283c8bf2010b35be8afdfbae71b7af",
    calls: [{ data: "0x", value: 19900000000000000n, target: "0x8375c615DEdf492B1B2036c786EDBcfB0801c3cb" }],
    portal: "0x684fBb731F21083f0f0d32f9d1625938a1008887",
    tokens: [],
    deadline: 1787299782n,
    nativeAmount: 19900000000000000n
  }
};
const intentHash = "0xd4ab74733903a3d85126a2167c54a327aca8f05b8526436d5c7ef8a9c1d52ee5";
const rewardHash = "0xf58e6d73a9984872ac12e261636a1f47d4b2b4cbfc3a9dd136c2570cdd5ac803";
const claimantBytes32 = "0x000000000000000000000000878344AF84A404439Ea37cFB9b30DeFd7938741C";
const sourceDomainID = 80002n;
const encodedData = "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000E36F117A981a39195C93Bb78e821caCF23CC88fe000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
const PortalAbi = (await import('./src/PortalAbi.json', { with: { type: 'json' } })).default;
const extraGas = 100000000000000000n; // 0.1 ETH
try {
  await targetPublicClient.simulateContract({
    account: "0x878344AF84A404439Ea37cFB9b30DeFd7938741C",
    address: PORTAL_ADDRESS,
    abi: PortalAbi,
    functionName: "fulfillAndProve",
    args: [intentHash, intentPayload.route, rewardHash, claimantBytes32, HYPER_PROVER_ADDRESS, sourceDomainID, encodedData],
    value: (intentPayload.route.nativeAmount + extraGas)
  });
  console.log("Simulation succeeded!");
} catch (err) {
  console.error("Simulation failed:", err.message);
}
