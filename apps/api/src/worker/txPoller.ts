import { prisma } from "../lib/prisma.js";
import { TransactionStatus } from "@prisma/client";
import { chainRegistry, EVMAdapter, SolanaAdapter, VM } from "@caw/wallet-core";

// Keep a map of EVM Adapters to reuse them instead of instantiating per transaction
const adapters = new Map<string, EVMAdapter>();

function getEVMAdapter(chainId: string): EVMAdapter {
  if (adapters.has(chainId)) {
    return adapters.get(chainId)!;
  }
  const config = chainRegistry.get(chainId);
  if (!config) throw new Error(`Chain not found in registry: ${chainId}`);
  if (config.vm !== VM.EVM) throw new Error(`Chain ${chainId} is not an EVM chain`);

  const adapter = new EVMAdapter(config);
  adapters.set(chainId, adapter);
  return adapter;
}

const solanaAdapters = new Map<string, SolanaAdapter>();

function getSolanaAdapter(chainId: string): SolanaAdapter {
  if (solanaAdapters.has(chainId)) {
    return solanaAdapters.get(chainId)!;
  }
  const config = chainRegistry.get(chainId);
  if (!config) throw new Error(`Chain not found in registry: ${chainId}`);
  if (config.vm !== VM.SOLANA) throw new Error(`Chain ${chainId} is not a Solana chain`);

  const adapter = new SolanaAdapter(config);
  solanaAdapters.set(chainId, adapter);
  return adapter;
}

export async function pollTransactions() {
  try {
    const pendingTxs = await prisma.transaction.findMany({
      where: {
        status: { in: [TransactionStatus.PENDING, TransactionStatus.BROADCAST] },
        txHash: { not: null },
      },
    });

    if (pendingTxs.length === 0) return;

    for (const tx of pendingTxs) {
      if (!tx.txHash) continue;
      
      try {
        const config = chainRegistry.get(tx.chainId);
        if (config?.vm === VM.EVM) {
          const adapter = getEVMAdapter(tx.chainId);
          const status = await adapter.getTransactionStatus(tx.txHash as `0x${string}`);
          
          if (status === "confirmed") {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: TransactionStatus.CONFIRMED },
            });
            console.log(`[txPoller] Tx ${tx.id} confirmed on chain!`);
          } else if (status === "failed") {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: TransactionStatus.FAILED },
            });
            console.log(`[txPoller] Tx ${tx.id} failed on chain!`);
          }
        } else if (config?.vm === VM.SOLANA) {
          const adapter = getSolanaAdapter(tx.chainId);
          const status = await adapter.getTransactionStatus(tx.txHash);
          
          if (status === "confirmed") {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: TransactionStatus.CONFIRMED },
            });
            console.log(`[txPoller] Tx ${tx.id} confirmed on Solana!`);
          } else if (status === "failed") {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: TransactionStatus.FAILED },
            });
            console.log(`[txPoller] Tx ${tx.id} failed on Solana!`);
          }
        } else {
          console.warn(`[txPoller] Skipped polling for non-EVM/Solana chain: ${tx.chainId}`);
        }
      } catch (err) {
        console.error(`[txPoller] Failed to poll tx ${tx.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[txPoller] Polling error:", err);
  }
}

let interval: NodeJS.Timeout | null = null;

export function startPoller(ms = 10000) {
  if (interval) return;
  console.log(`[txPoller] Starting transaction poller (every ${ms}ms)`);
  interval = setInterval(pollTransactions, ms);
}

export function stopPoller() {
  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log("[txPoller] Stopped");
  }
}
