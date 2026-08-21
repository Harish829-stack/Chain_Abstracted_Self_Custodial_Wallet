import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
const client = createPublicClient({ chain: sepolia, transport: http("https://sepolia.infura.io/v3/86b7c03e8d49460ca30a6845f81a6c80") });
const abi = [{ "inputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "name": "provenIntents", "outputs": [{ "internalType": "bytes32", "name": "claimant", "type": "bytes32" }, { "internalType": "uint64", "name": "destination", "type": "uint64" }], "stateMutability": "view", "type": "function" }];
const res1 = await client.readContract({ address: "0x6506C6AcA36c86165885D5d51be9cab06FB700Ea", abi, functionName: "provenIntents", args: ["0xeb1d02ae58f5fc51418b6f0248c1a037ea629b60db45583dd3bb0442ceba8eca"] });
console.log("For Claimer hash:", res1);
const res2 = await client.readContract({ address: "0x6506C6AcA36c86165885D5d51be9cab06FB700Ea", abi, functionName: "provenIntents", args: ["0xeb1d02ae58f5fc51418b6f0248c1a337ea629b60db45583dd3bb3442ceba8eca"] });
console.log("For Explorer hash:", res2);
