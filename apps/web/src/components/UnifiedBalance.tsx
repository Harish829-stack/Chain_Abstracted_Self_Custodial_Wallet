"use client";

import { useEffect, useState } from "react";
import { useDynamicContext, getAuthToken } from "@dynamic-labs/sdk-react-core";

interface PortfolioResponse {
  totalUsd: number;
  breakdown: Record<string, number>;
}

export function UnifiedBalance() {
  const { primaryWallet, userWallets } = useDynamicContext();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Sync wallets to backend whenever they change
  useEffect(() => {
    const syncWallets = async () => {
      const authToken = getAuthToken();
      const walletsToSync = userWallets && userWallets.length > 0 ? userWallets : (primaryWallet ? [primaryWallet] : []);
      
      if (walletsToSync.length === 0 || !authToken) return;

      const addresses = walletsToSync.map((w) => ({
        address: w.address,
        chain: w.chain, // "EVM" or "SOLANA"
      }));

      try {
        await fetch("http://localhost:3001/wallets/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ addresses }),
        });
      } catch (err) {
        console.error("Failed to sync wallets:", err);
      }
    };

    syncWallets();
  }, [userWallets, primaryWallet]);

  // 2. Fetch the unified portfolio balance
  useEffect(() => {
    const fetchPortfolio = async () => {
      const authToken = getAuthToken();
      if (!primaryWallet || !authToken) return;

      setLoading(true);
      try {
        const res = await fetch("http://localhost:3001/wallets/portfolio", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          setPortfolio(data);
        }
      } catch (err) {
        console.error("Failed to fetch portfolio:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [primaryWallet]);

  if (!primaryWallet) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      color: "white",
      padding: "2rem",
      borderRadius: "16px",
      boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
      width: "100%",
      maxWidth: "1000px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem"
    }}>
      <h2 style={{ margin: 0, fontSize: "1.2rem", opacity: 0.9 }}>Unified Balance</h2>
      
      {loading && !portfolio ? (
        <div style={{ fontSize: "2rem", fontWeight: "bold" }}>Loading...</div>
      ) : (
        <div style={{ fontSize: "4rem", fontWeight: "bold" }}>
          ${portfolio?.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
        </div>
      )}
    </div>
  );
}
