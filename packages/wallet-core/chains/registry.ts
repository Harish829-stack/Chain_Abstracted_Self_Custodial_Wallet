import { ChainId, VM } from "../wallet/types";
import { ChainConfig } from "./types";

export class ChainRegistry {
  private chains: Map<ChainId, ChainConfig> = new Map();

  constructor() {
    this.register({
      id: "421614",
      name: "Arbitrum Sepolia",
      vm: VM.EVM,
      rpcUrl: process.env.RPC_ARBITRUM_SEPOLIA
        ?? process.env.NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA
        ?? "https://sepolia-rollup.arbitrum.io/rpc",
      explorerUrl: "https://sepolia.arbiscan.io",
      nativeCurrency: { symbol: "ETH", decimals: 18 },
      supportsGasSponsorship: false,
      supportsSwaps: true,
    });

    this.register({
      id: "80002",
      name: "Polygon Amoy",
      vm: VM.EVM,
      rpcUrl: process.env.RPC_POLYGON_AMOY
        ?? process.env.NEXT_PUBLIC_RPC_POLYGON_AMOY
        ?? "https://polygon-amoy-bor-rpc.publicnode.com",
      explorerUrl: "https://amoy.polygonscan.com",
      nativeCurrency: { symbol: "POL", decimals: 18 },
      supportsGasSponsorship: false,
      supportsSwaps: true,
    });

    this.register({
      id: "11155111",
      name: "Ethereum Sepolia",
      vm: VM.EVM,
      rpcUrl: process.env.RPC_ETH_SEPOLIA
        ?? process.env.NEXT_PUBLIC_RPC_ETH_SEPOLIA
        ?? "https://ethereum-sepolia-rpc.publicnode.com",
      explorerUrl: "https://sepolia.etherscan.io",
      nativeCurrency: { symbol: "ETH", decimals: 18 },
      supportsGasSponsorship: false, // Wait until Step 10 ships
      supportsSwaps: true,
    });

    this.register({
      id: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      name: "Solana Devnet",
      vm: VM.SOLANA,
      rpcUrl: process.env.RPC_SOLANA_DEVNET
        ?? process.env.NEXT_PUBLIC_RPC_SOLANA_DEVNET
        ?? "https://api.devnet.solana.com",
      explorerUrl: "https://explorer.solana.com/?cluster=devnet",
      nativeCurrency: { symbol: "SOL", decimals: 9 },
      supportsGasSponsorship: false, // Reverted from mock so real txs can be sent
      supportsSwaps: false, // Wait until MVP hardening
    });
  }

  public register(config: ChainConfig): void {
    this.chains.set(config.id, config);
  }

  public get(id: ChainId): ChainConfig {
    const config = this.chains.get(id);
    if (!config) {
      throw new Error(`Chain config not found for id: ${id}`);
    }
    return config;
  }

  public getAll(): ChainConfig[] {
    return Array.from(this.chains.values());
  }

  public getSupportedVMs(): VM[] {
    const vms = new Set<VM>();
    for (const config of this.chains.values()) {
      vms.add(config.vm);
    }
    return Array.from(vms);
  }
}

// Export singleton instance
export const chainRegistry = new ChainRegistry();
