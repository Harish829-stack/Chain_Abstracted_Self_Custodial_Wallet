import Redis from "ioredis";
import { prisma } from "../lib/prisma.js";

// Initialize Redis client using the environment variable
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});
redis.on("error", (err) => {
  // Suppress connection errors if Redis isn't running to prevent unhandled exceptions
  if (err.code !== "ECONNREFUSED") console.error("Redis Error:", err);
});

const ZERION_API_KEY = process.env.ZERION_API_KEY;

export interface PortfolioResponse {
  totalUsd: number;
  breakdown: Record<string, number>;
}

export class BalanceService {
  /**
   * Fetches the unified portfolio balance for a user.
   * Caches the result in Redis for 60 seconds.
   */
  static async getUnifiedBalance(userId: string): Promise<PortfolioResponse> {
    const cacheKey = `portfolio:${userId}`;
    
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (err) {
      console.warn("Redis get failed, bypassing cache:", err);
    }
    
    if (cached) {
      return JSON.parse(cached) as PortfolioResponse;
    }

    // 2. Fetch all wallet addresses for the user
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      include: { addresses: true },
    });

    const addresses = wallets.flatMap((w) => w.addresses.map((a) => a.address));
    
    if (addresses.length === 0) {
      return { totalUsd: 0, breakdown: {} };
    }

    // 3. Deduplicate addresses (in case same address on multiple chains/VMs)
    const uniqueAddresses = Array.from(new Set(addresses));

    // 4. Query Zerion API for each address in parallel
    const promises = uniqueAddresses.map(async (address) => {
      if (!ZERION_API_KEY) {
        console.warn("ZERION_API_KEY is not set.");
        return null;
      }
      
      try {
        const res = await fetch(`https://api.zerion.io/v1/wallets/${address}/portfolio`, {
          headers: {
            "accept": "application/json",
            "authorization": `Basic ${Buffer.from(`${ZERION_API_KEY}:`).toString("base64")}`,
          },
        });
        
        if (!res.ok) {
          console.warn(`Failed to fetch Zerion for ${address}: ${res.statusText}`);
          return null;
        }
        
        return await res.json();
      } catch (err) {
        console.error(`Zerion fetch error for ${address}:`, err);
        return null;
      }
    });

    const results = await Promise.all(promises);

    // 5. Aggregate results
    let totalUsd = 0;
    const breakdown: Record<string, number> = {};

    for (const data of results) {
      if (data?.data?.attributes) {
        const attrs = data.data.attributes;
        totalUsd += (attrs.total?.positions || 0);
        
        const positions = attrs.positions_distribution_by_chain || {};
        for (const [chain, value] of Object.entries(positions)) {
          if (typeof value === 'number') {
            breakdown[chain] = (breakdown[chain] || 0) + value;
          }
        }
      }
    }

    // 5b. Fetch testnet balances to mock as real USD values (for dev purposes)
    const MOCK_ETH_PRICE = 2600;
    const MOCK_SOL_PRICE = 140;

    for (const address of uniqueAddresses) {
      try {
        // Test EVM (Ethereum Sepolia)
        const ethRes = await fetch("https://ethereum-sepolia-rpc.publicnode.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 })
        });
        const ethData = await ethRes.json();
        if (ethData.result) {
          const balanceEth = parseInt(ethData.result, 16) / 1e18;
          const usdValue = balanceEth * MOCK_ETH_PRICE;
          if (usdValue > 0) {
            totalUsd += usdValue;
            breakdown["ethereum-sepolia (testnet mocked)"] = (breakdown["ethereum-sepolia (testnet mocked)"] || 0) + usdValue;
          }
        }

        // Test Solana (Devnet)
        // Ensure it's a valid Base58 address length for Solana to avoid bad requests
        if (address.length >= 32 && address.length <= 44 && !address.startsWith("0x")) {
          const solRes = await fetch("https://api.devnet.solana.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "getBalance", params: [address], id: 1 })
          });
          const solData = await solRes.json();
          if (solData.result?.value) {
            const balanceSol = solData.result.value / 1e9;
            const usdValue = balanceSol * MOCK_SOL_PRICE;
            if (usdValue > 0) {
              totalUsd += usdValue;
              breakdown["solana-devnet (testnet mocked)"] = (breakdown["solana-devnet (testnet mocked)"] || 0) + usdValue;
            }
          }
        }

        // Test EVM (Arbitrum Sepolia)
        if (address.startsWith("0x")) {
          const arbRes = await fetch("https://sepolia-rollup.arbitrum.io/rpc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 })
          });
          const arbData = await arbRes.json();
          if (arbData.result) {
            const balanceEth = parseInt(arbData.result, 16) / 1e18;
            const usdValue = balanceEth * MOCK_ETH_PRICE;
            if (usdValue > 0) {
              totalUsd += usdValue;
              breakdown["arbitrum-sepolia (testnet mocked)"] = (breakdown["arbitrum-sepolia (testnet mocked)"] || 0) + usdValue;
            }
          }
        }

        // Test EVM (Polygon Amoy)
        if (!address.startsWith("0x")) continue;
        const amoyRes = await fetch("https://polygon-amoy-bor-rpc.publicnode.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 })
        });
        const amoyData = await amoyRes.json();
        if (amoyData.result) {
          const balancePol = parseInt(amoyData.result, 16) / 1e18;
          // Polygon Amoy is POL (MATIC), mock price around $0.50
          const usdValue = balancePol * 0.50; 
          if (usdValue > 0) {
            totalUsd += usdValue;
            breakdown["polygon-amoy (testnet mocked)"] = (breakdown["polygon-amoy (testnet mocked)"] || 0) + usdValue;
          }
        }
      } catch (err) {
        console.warn(`Failed to mock testnet balance for ${address}:`, err);
      }
    }

    const portfolio: PortfolioResponse = { totalUsd, breakdown };

    // 6. Cache for 60 seconds
    try {
      await redis.setex(cacheKey, 60, JSON.stringify(portfolio));
    } catch (err) {
      console.warn("Redis setex failed:", err);
    }

    return portfolio;
  }
}
