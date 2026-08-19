import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createWalletClient, createPublicClient, http } from "viem";
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
export const pool = new Pool({ 
  connectionString, 
  max: 2, 
  ssl: { rejectUnauthorized: false } 
});

export const PORTAL_ADDRESS = "0x154115F055A5Ff2584ABcB013C6832F19F0D8bc5";
export const HYPER_PROVER_ADDRESS = "0x3d2D283731a900547Ef065057dBf704B6fec19C7";

const solverPrivateKey = process.env.SOLVER_PRIVATE_KEY;

if (!solverPrivateKey) {
  console.warn("⚠️ SOLVER_PRIVATE_KEY not set in .env! Cannot execute real fulfillments.");
}

export const account = solverPrivateKey ? privateKeyToAccount(
  solverPrivateKey.startsWith("0x") ? (solverPrivateKey as `0x${string}`) : `0x${solverPrivateKey}`
) : null;

export const publicClients: Record<string, any> = {
  "80002": createPublicClient({ chain: polygonAmoy, transport: http(process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/") }),
  "11155111": createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org") }),
  "421614": createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc") })
};

export const walletClients: Record<string, any> = {
  "80002": account ? createWalletClient({ account, chain: polygonAmoy, transport: http(process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/") }) : null,
  "11155111": account ? createWalletClient({ account, chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org") }) : null,
  "421614": account ? createWalletClient({ account, chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc") }) : null
};

export { PortalAbi, HyperProverAbi };
