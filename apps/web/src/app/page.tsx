"use client";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { SendForm } from "../components/SendForm";
import { TransactionHistory } from "../components/TransactionHistory";
import { UnifiedBalance } from "../components/UnifiedBalance";

export default function Home() {
  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minHeight: "100vh", gap: "1.5rem", fontFamily: "sans-serif", padding: "4rem 2rem" }}>
      <h1>Chain Abstracted Wallet</h1>

      <DynamicWidget />

      <UnifiedBalance />

      <div style={{ display: "flex", gap: "2rem", width: "100%", maxWidth: "1000px", marginTop: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
        <SendForm />
        <TransactionHistory />
      </div>
    </main>
  );
}
