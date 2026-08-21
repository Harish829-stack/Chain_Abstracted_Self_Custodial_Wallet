import { createPublicClient, http, encodeFunctionData, pad } from 'viem';
import { sepolia } from 'viem/chains';
const client = createPublicClient({ chain: sepolia, transport: http("https://sepolia.infura.io/v3/86b7c03e8d49460ca30a6845f81a6c80") });
const MAILBOX = "0xea87ae93fa0019a226b59ecd8078e6eaf9b34e6e";
const abi = [{
    "inputs": [
      { "internalType": "uint32", "name": "destinationDomain", "type": "uint32" },
      { "internalType": "bytes32", "name": "recipientAddress", "type": "bytes32" },
      { "internalType": "bytes", "name": "messageBody", "type": "bytes" }
    ],
    "name": "quoteDispatch",
    "outputs": [{ "internalType": "uint256", "name": "fee", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }];
try {
  const fee = await client.readContract({
    address: MAILBOX,
    abi,
    functionName: 'quoteDispatch',
    args: [80002, pad("0xE36F117A981a39195C93Bb78e821caCF23CC88fe", { size: 32 }), "0x1234"]
  });
  console.log("Fee:", fee);
} catch (e) {
  console.log("Reverted:", e.message);
}
