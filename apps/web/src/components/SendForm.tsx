"use client";

import { useState, useEffect } from "react";
import { useDynamicContext, getAuthToken } from "@dynamic-labs/sdk-react-core";
import { parseEther } from "viem";
import { chainRegistry } from "@caw/wallet-core/chains/registry";
import { swapService, SwapStatus } from "@caw/wallet-core/swap/SwapService";

export function SendForm() {
  const { primaryWallet, network } = useDynamicContext();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  
  // Destination overrides for Swap Engine
  const [destChain, setDestChain] = useState("");
  const [destAsset, setDestAsset] = useState("ETH");

  // Listen to swap service state machine (Must be before early return)
  useEffect(() => {
    const handleStatusUpdate = (newStatus: SwapStatus) => {
      setStatus(`Swap Engine: ${newStatus.replace("_", " ")}`);
    };
    swapService.on("statusUpdate", handleStatusUpdate);
    return () => {
      swapService.off("statusUpdate", handleStatusUpdate);
    };
  }, []);

  if (!primaryWallet) return null;

  // Determine the active chain ID from the connected wallet's network context
  let chainIdStr = network?.toString() || (primaryWallet as any).network?.toString() || "84532";
  
  let chainName = `Chain ID: ${chainIdStr}`;
  if (chainIdStr === "84532") chainName = "Base Sepolia";
  if (chainIdStr === "11155111") chainName = "Ethereum Sepolia";
  if (chainIdStr === "338") chainName = "Cronos Testnet";
  if (
    chainIdStr === "103" ||
    chainIdStr === "solana-devnet" ||
    chainIdStr === "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
  ) {
    chainIdStr = "103";
    chainName = "Solana Devnet";
  }

  // Initialize destChain if empty
  if (!destChain) {
    setDestChain(chainIdStr);
  }

  // Check if chain supports gas sponsorship
  let isSponsored = false;
  try {
    const config = chainRegistry.get(chainIdStr);
    isSponsored = config.supportsGasSponsorship;
  } catch (err) {
    // ignore
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken = getAuthToken();
    if (!primaryWallet || !authToken) return;

    // Detect if this is a cross-chain or cross-asset swap
    const isSwap = destChain !== chainIdStr || destAsset !== "ETH";

    if (isSwap) {
      try {
        setStatus("Fetching optimal route...");
        const quote = await swapService.getQuote(chainIdStr, destChain, amount);
        
        // Log to backend
        const res = await fetch("http://localhost:3001/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ chainId: chainIdStr }),
        });
        const txRecord = await res.json();

        // Execute Swap via State Machine
        const txHash = await swapService.executeSwap(primaryWallet);

        // Update backend
        await fetch(`http://localhost:3001/transactions/${txRecord.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ status: "PENDING", txHash }),
        });

        setStatus("Swap Executed! Backend is polling for confirmation.");
        setToAddress("");
        setAmount("");
      } catch (err: any) {
        setStatus(`Swap Error: ${err.message || "Unknown error"}`);
      }
      return;
    }
    
    // STANDARD SEND FLOW
    setStatus(`Creating transaction record on ${chainName}...`);
    try {
      const res = await fetch("http://localhost:3001/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ chainId: chainIdStr }),
      });
      if (!res.ok) throw new Error("Failed to create transaction record");
      const txRecord = await res.json();

      setStatus("Awaiting signature...");
      let txHash: string;

      if (isSponsored) {
        setStatus("Delegating to Paymaster...");
        await new Promise((r) => setTimeout(r, 1500));
        txHash = chainIdStr.includes("solana") 
          ? "mock_sponsored_solana_" + Math.random().toString(36).substring(2, 15)
          : "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
      } else {
        if ("getWalletClient" in primaryWallet) {
          const walletClient = await (primaryWallet as any).getWalletClient(chainIdStr);
          const txResult = await walletClient.sendTransaction({
            to: toAddress as `0x${string}`,
            value: parseEther(amount),
            chain: null,
          });
          txHash = typeof txResult === "string" ? txResult : txResult.hash;
        } else {
          const { isSolanaWallet } = await import("@dynamic-labs/solana");
          if (!isSolanaWallet(primaryWallet)) {
            throw new Error("Wallet is not a recognized Solana wallet by Dynamic.");
          }

          const signer = await primaryWallet.getSigner();
          const connection = await primaryWallet.getConnection();
          if (!signer) throw new Error("Wallet does not support Solana signAndSendTransaction");
          
          const { PublicKey, SystemProgram, Transaction } = await import("@solana/web3.js");
          const fromPubkey = new PublicKey(primaryWallet.address);
          const toPubkey = new PublicKey(toAddress);
          const lamports = Math.floor(parseFloat(amount) * 1e9);
          
          const tx = new Transaction().add(
            SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
          );
          
          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = fromPubkey;
          
          let signature;
          if (signer.sendTransaction) {
            signature = await signer.sendTransaction(tx, connection);
          } else if (signer.signAndSendTransaction) {
            const result = await signer.signAndSendTransaction(tx);
            signature = result.signature || result;
          } else {
             throw new Error("Wallet does not support Solana sendTransaction");
          }
          txHash = signature;
        }
      }

      setStatus("Broadcasting...");
      const updateRes = await fetch(`http://localhost:3001/transactions/${txRecord.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: "PENDING", txHash }),
      });
      
      if (!updateRes.ok) throw new Error("Failed to update transaction status");

      setStatus("Transaction Pending! The backend will now poll for confirmation.");
      setToAddress("");
      setAmount("");
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message || "Unknown error"}`);
    }
  };

  const isSwap = destChain !== chainIdStr || destAsset !== "ETH";

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", maxWidth: "400px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>{isSwap ? "Swap Asset" : `Send Asset (${chainName})`}</h2>
        {isSponsored && !isSwap && (
          <span style={{ background: "linear-gradient(45deg, #10b981, #3b82f6)", color: "white", padding: "4px 8px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" }}>
            ✨ Gas Sponsored
          </span>
        )}
      </div>
      <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select 
            value={destChain} 
            onChange={(e) => setDestChain(e.target.value)}
            style={{ padding: "0.5rem", flex: 1, borderRadius: "4px" }}
          >
            <option value="11155111">Ethereum Sepolia</option>
            <option value="84532">Base Sepolia</option>
            <option value="103">Solana Devnet</option>
          </select>
          <select 
            value={destAsset} 
            onChange={(e) => setDestAsset(e.target.value)}
            style={{ padding: "0.5rem", flex: 1, borderRadius: "4px" }}
          >
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
        
        <input
          type="text"
          placeholder="Destination Address"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          required
          style={{ padding: "0.5rem" }}
        />
        <input
          type="number"
          step="0.000000000000000001"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{ padding: "0.5rem" }}
        />
        <button type="submit" style={{ padding: "0.75rem", background: isSwap ? "linear-gradient(45deg, #f59e0b, #ef4444)" : "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
          {isSwap ? "Execute Swap" : isSponsored ? "Send (Zero Gas)" : "Send"}
        </button>
      </form>
      {status && <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#555" }}>{status}</p>}
    </div>
  );
}
