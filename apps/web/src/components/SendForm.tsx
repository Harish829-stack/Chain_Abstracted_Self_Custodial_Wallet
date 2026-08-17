"use client";

import { useState } from "react";
import { useDynamicContext, getAuthToken } from "@dynamic-labs/sdk-react-core";
import { parseEther } from "viem";

export function SendForm() {
  const { primaryWallet, network } = useDynamicContext();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  if (!primaryWallet) return null;

  // Determine the active chain ID from the connected wallet's network context
  // 'network' is exposed directly on the context in Dynamic SDK
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
    chainIdStr = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
    chainName = "Solana Devnet";
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const authToken = getAuthToken();
    if (!primaryWallet || !authToken) return;
    
    setStatus(`Creating transaction record on ${chainName}...`);
    try {
      // 1. Log to backend: CREATED
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

      // 2. Prompt user to sign
      setStatus("Awaiting signature...");
      
      let txHash: string;
      if ("getWalletClient" in primaryWallet) {
        // Safe cast for EthereumWallet from Dynamic
        const walletClient = await (primaryWallet as any).getWalletClient(chainIdStr);
        const txResult = await walletClient.sendTransaction({
          to: toAddress as `0x${string}`,
          value: parseEther(amount), // viem expects bigint
          chain: null,
        });
        txHash = typeof txResult === "string" ? txResult : txResult.hash;
      } else {
        // Attempt Solana transaction
        const { isSolanaWallet } = await import("@dynamic-labs/solana");
        if (!isSolanaWallet(primaryWallet)) {
          throw new Error("Wallet is not a recognized Solana wallet by Dynamic.");
        }

        const signer = await primaryWallet.getSigner();
        const connection = await primaryWallet.getConnection();
        
        if (!signer) {
          throw new Error("Wallet does not support Solana signAndSendTransaction");
        }
        
        // Import dynamically or assume it's available via window if script tag, but we installed the package
        const { PublicKey, SystemProgram, Transaction } = await import("@solana/web3.js");
        
        const fromPubkey = new PublicKey(primaryWallet.address);
        const toPubkey = new PublicKey(toAddress);
        const lamports = Math.floor(parseFloat(amount) * 1e9); // 1 SOL = 1e9 lamports
        
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = fromPubkey;
        
        let signature;
        if (signer.sendTransaction) {
          // Standard solana wallet adapter requires connection as second arg
          signature = await signer.sendTransaction(tx, connection);
        } else if (signer.signAndSendTransaction) {
          // Fallback if it has signAndSendTransaction natively
          const result = await signer.signAndSendTransaction(tx);
          signature = result.signature || result;
        } else {
           throw new Error("Wallet does not support Solana sendTransaction");
        }
        
        txHash = signature;
      }

      // 3. Update backend: PENDING
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

  return (
    <div style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px", maxWidth: "400px", width: "100%" }}>
      <h2>Send Asset ({chainName})</h2>
      <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
        <button type="submit" style={{ padding: "0.75rem", background: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Send
        </button>
      </form>
      {status && <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#555" }}>{status}</p>}
    </div>
  );
}
