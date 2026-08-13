"use client";

import { useState } from "react";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { chainRegistry, type ChainConfig } from "@caw/wallet-core";

const ALL_CHAINS = chainRegistry.getAll();

export default function Home() {
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(ALL_CHAINS[0]);

  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", fontFamily: "sans-serif" }}>
      <h1>Chain Abstracted Wallet</h1>

      {/* Dynamic handles: login, logout, address, balance, send, receive, network switch */}
      <DynamicWidget />

      {/* Shows which chains our registry supports — informational only until Step 6 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
        <label htmlFor="network-select" style={{ fontWeight: "600", fontSize: "0.9rem" }}>
          Supported Network
        </label>
        <select
          id="network-select"
          value={selectedChain.id}
          onChange={(e) => {
            const chain = ALL_CHAINS.find((c) => c.id === e.target.value);
            if (chain) setSelectedChain(chain);
          }}
          style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem", minWidth: "220px" }}
        >
          {ALL_CHAINS.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name} ({chain.vm})
            </option>
          ))}
        </select>
      </div>
    </main>
  );
}
