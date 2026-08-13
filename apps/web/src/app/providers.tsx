"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
        overrides: { evmNetworks },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
