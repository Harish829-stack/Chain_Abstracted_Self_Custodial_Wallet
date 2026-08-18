import { ChainId, VM } from "../wallet/types";
import { ChainConfig } from "./types";

export class ChainRegistry {
  private chains: Map<ChainId, ChainConfig> = new Map();

  constructor() {
    this.register({
      id: "84532",
      name: "Base Sepolia",
      vm: VM.EVM,
      rpcUrl: process.env.RPC_BASE_SEPOLIA
        ?? process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA
        ?? (console.warn("RPC_BASE_SEPOLIA not set, falling back to public RPC"), "https://sepolia.base.org"),
      explorerUrl: "https://sepolia.basescan.org",
      nativeCurrency: { symbol: "ETH", decimals: 18 },
      supportsGasSponsorship: false, // Reverted from mock so real txs can be sent
      supportsSwaps: true,
    });

    this.register({
      id: "11155111",
      name: "Ethereum Sepolia",
      vm: VM.EVM,
      rpcUrl: process.env.RPC_ETH_SEPOLIA
        ?? process.env.NEXT_PUBLIC_RPC_ETH_SEPOLIA
        ?? (console.warn("RPC_ETH_SEPOLIA not set, falling back to public RPC"), "https://ethereum-sepolia-rpc.publicnode.com"),
      explorerUrl: "https://sepolia.etherscan.io",
      nativeCurrency: { symbol: "ETH", decimals: 18 },
      supportsGasSponsorship: false, // Wait until Step 10 ships
      supportsSwaps: true,
    });

    this.register({
      id: "338",
      name: "Cronos Testnet",
      vm: VM.EVM,
      rpcUrl: process.env.RPC_CRONOS_TESTNET
        ?? process.env.NEXT_PUBLIC_RPC_CRONOS_TESTNET
        ?? (console.warn("RPC_CRONOS_TESTNET not set, falling back to public RPC"), "https://evm-t3.cronos.org"),
      explorerUrl: "https://explorer.cronos.org/testnet",
      nativeCurrency: { symbol: "TCRO", decimals: 18 },
      supportsGasSponsorship: false,
      supportsSwaps: true,
    });

    this.register({
      id: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      name: "Solana Mainnet",
      vm: VM.SOLANA,
      rpcUrl: process.env.RPC_SOLANA_MAINNET
        ?? process.env.NEXT_PUBLIC_RPC_SOLANA_MAINNET
        ?? (console.warn("RPC_SOLANA_MAINNET not set, falling back to public RPC"), "https://api.mainnet-beta.solana.com"),
      explorerUrl: "https://explorer.solana.com",
      nativeCurrency: { symbol: "SOL", decimals: 9 },
      supportsGasSponsorship: false,
      supportsSwaps: true,
    });

    this.register({
      id: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
      name: "Solana Testnet",
      vm: VM.SOLANA,
      rpcUrl: process.env.RPC_SOLANA_TESTNET
        ?? process.env.NEXT_PUBLIC_RPC_SOLANA_TESTNET
        ?? (console.warn("RPC_SOLANA_TESTNET not set, falling back to public RPC"), "https://api.testnet.solana.com"),
      explorerUrl: "https://explorer.solana.com/?cluster=testnet",
      nativeCurrency: { symbol: "SOL", decimals: 9 },
      supportsGasSponsorship: false,
      supportsSwaps: false,
    });

    this.register({
      id: "103",
      name: "Solana Devnet",
      vm: VM.SOLANA,
      rpcUrl: process.env.RPC_SOLANA_DEVNET
        ?? process.env.NEXT_PUBLIC_RPC_SOLANA_DEVNET
        ?? (console.warn("RPC_SOLANA_DEVNET not set, falling back to public RPC"), "https://api.devnet.solana.com"),
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
