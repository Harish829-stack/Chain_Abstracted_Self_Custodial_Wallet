"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { chainRegistry, VM } from "@caw/wallet-core";

const DYNAMIC_ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!;

// Build Dynamic's evmNetworks config from our ChainRegistry for metadata,
// but use NEXT_PUBLIC_ RPC URLs so they are accessible in the browser and
// point to CORS-enabled endpoints (process.env.RPC_* is server-only).
const evmNetworks = chainRegistry
  .getAll()
  .filter((c) => c.vm === VM.EVM)
  .map((c) => {
    // Pick the browser-safe RPC for this chain
    const browserRpc =
      c.id === "84532"
        ? process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? "https://sepolia.base.org"
        : c.id === "338"
        ? process.env.NEXT_PUBLIC_RPC_CRONOS_TESTNET ?? "https://evm-t3.cronos.org"
        : process.env.NEXT_PUBLIC_RPC_ETH_SEPOLIA ?? "https://ethereum-sepolia-rpc.publicnode.com";

    return {
      blockExplorerUrls: [c.explorerUrl],
      chainId: Number(c.id),
      chainName: c.name,
      iconUrls: [],
      isTestnet: true,
      name: c.name,
      nativeCurrency: {
        decimals: c.nativeCurrency.decimals,
        name: c.nativeCurrency.symbol,
        symbol: c.nativeCurrency.symbol,
      },
      networkId: Number(c.id),
      rpcUrls: [browserRpc],
      vanityName: c.name,
    };
  });

// Solana config — map all Solana networks from the registry
const solanaNetworks = chainRegistry
  .getAll()
  .filter((c) => c.vm === VM.SOLANA)
  .map((c) => {
    // Determine the Dynamic chainId/networkId based on the CAIP-2 ID
    let dynamicId = 101; // default to mainnet
    if (c.id.includes("4uhcVJyU9pJkvQyS")) dynamicId = 102; // Testnet
    else if (c.id.includes("EtWTRABZaYq6iMfe")) dynamicId = 103; // Devnet

    // Pick the browser-safe RPC for this chain
    const browserRpc =
      dynamicId === 103
        ? process.env.NEXT_PUBLIC_RPC_SOLANA_DEVNET ?? "https://api.devnet.solana.com"
        : dynamicId === 102
        ? process.env.NEXT_PUBLIC_RPC_SOLANA_TESTNET ?? "https://api.testnet.solana.com"
        : process.env.NEXT_PUBLIC_RPC_SOLANA_MAINNET ?? "https://api.mainnet-beta.solana.com";

    return {
      blockExplorerUrls: [c.explorerUrl],
      chainId: dynamicId.toString(), // String for Solana chainId in Dynamic
      chainName: c.name,
      iconUrls: [],
      isTestnet: dynamicId !== 101,
      name: c.name,
      nativeCurrency: {
        decimals: c.nativeCurrency.decimals,
        name: c.nativeCurrency.symbol,
        symbol: c.nativeCurrency.symbol,
      },
      networkId: dynamicId, // Numeric networkId
      rpcUrls: [browserRpc],
      vanityName: c.name,
    };
  });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
        overrides: {
          evmNetworks,
          ...(solanaNetworks ? { solNetworks: solanaNetworks } : {}),
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
