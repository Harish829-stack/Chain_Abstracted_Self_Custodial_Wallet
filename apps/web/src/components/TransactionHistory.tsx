"use client";

import { useEffect, useState } from "react";
import { useDynamicContext, getAuthToken } from "@dynamic-labs/sdk-react-core";

type Transaction = {
  id: string;
  createdAt: string;
  chainId: string;
  status: string;
  txHash: string | null;
};

function getExplorerUrl(chainId: string, txHash: string) {
  switch (chainId) {
    case "84532":
      return `https://sepolia.basescan.org/tx/${txHash}`;
    case "11155111":
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    case "80002":
      return `https://amoy.polygonscan.com/tx/${txHash}`;
    case "338":
      return `https://explorer.cronos.org/testnet/tx/${txHash}`;
    case "103":
    case "solana-devnet":
    case "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1":
      return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
    default:
      // Fallback generically, though usually won't work perfectly for every chain
      return `https://etherscan.io/tx/${txHash}`;
  }
}

export function TransactionHistory() {
  const { primaryWallet } = useDynamicContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const authToken = getAuthToken();
    if (!authToken || !primaryWallet) return;

    const fetchTransactions = async () => {
      try {
        const res = await fetch("http://localhost:3001/transactions", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (err) {
        console.error("Failed to fetch transactions", err);
      }
    };

    fetchTransactions();
    // Poll every 5 seconds to get status updates from the backend worker
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [primaryWallet]);

  if (!primaryWallet) return null;

  return (
    <div style={{ marginTop: "2rem", width: "100%", maxWidth: "600px" }}>
      <h2>Transaction History</h2>
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {transactions.map((tx) => (
            <li key={tx.id} style={{ border: "1px solid #eee", padding: "1rem", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <strong>{tx.status}</strong>
                <span style={{ fontSize: "0.85rem", color: "#666" }}>
                  {new Date(tx.createdAt).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: "0.9rem", color: "#444" }}>
                Chain: {tx.chainId} <br />
                {tx.txHash && (
                  <span>
                    Tx Hash:{" "}
                    <a
                      href={getExplorerUrl(tx.chainId, tx.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#0070f3" }}
                    >
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </a>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
