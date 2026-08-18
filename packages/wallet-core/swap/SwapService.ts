import { EventEmitter } from "events";

export enum SwapStatus {
  IDLE = "IDLE",
  FETCHING_QUOTE = "FETCHING_QUOTE",
  QUOTE_RECEIVED = "QUOTE_RECEIVED",
  USER_CONFIRMED = "USER_CONFIRMED",
  EXECUTING = "EXECUTING",
  BRIDGING = "BRIDGING",
  FILLED = "FILLED",
  FAILED = "FAILED",
}

export interface SwapQuote {
  fromChain: string;
  toChain: string;
  fromAmount: string;
  toAmount: string;
  estimatedDurationSeconds: number;
}

export class SwapService extends EventEmitter {
  private status: SwapStatus = SwapStatus.IDLE;
  private currentQuote: SwapQuote | null = null;

  constructor() {
    super();
  }

  public getStatus(): SwapStatus {
    return this.status;
  }

  private setStatus(newStatus: SwapStatus) {
    this.status = newStatus;
    this.emit("statusUpdate", newStatus);
  }

  public async getQuote(fromChain: string, toChain: string, amount: string): Promise<SwapQuote> {
    this.setStatus(SwapStatus.FETCHING_QUOTE);
    
    // Simulate API call to LI.FI or similar provider
    await new Promise((r) => setTimeout(r, 1500));
    
    // Mocking 1:1 testnet swap with minor slippage
    this.currentQuote = {
      fromChain,
      toChain,
      fromAmount: amount,
      toAmount: (parseFloat(amount) * 0.99).toString(),
      estimatedDurationSeconds: 15,
    };

    this.setStatus(SwapStatus.QUOTE_RECEIVED);
    return this.currentQuote;
  }

  public async executeSwap(wallet: any): Promise<string> {
    if (!this.currentQuote) throw new Error("No quote available to execute");
    
    this.setStatus(SwapStatus.USER_CONFIRMED);
    await new Promise((r) => setTimeout(r, 1000));
    
    this.setStatus(SwapStatus.EXECUTING);
    
    // Request a REAL signature from the user to make the mock feel authentic
    let txHash: string;
    try {
      if ("signMessage" in wallet) {
        // EVM Wallet
        const signature = await wallet.signMessage("Confirm Cross-Chain Swap Execution");
        txHash = "mock_swap_" + signature.substring(0, 20);
      } else {
        // Solana Wallet
        const signer = await wallet.getSigner();
        if (signer.signMessage) {
          const encodedMessage = new TextEncoder().encode("Confirm Cross-Chain Swap Execution");
          const signature = await signer.signMessage(encodedMessage);
          // Convert Uint8Array to hex string for the mock hash
          const signatureHex = Buffer.from(signature.signature || signature).toString('hex');
          txHash = "mock_swap_sol_" + signatureHex.substring(0, 20);
        } else {
          // Fallback if no signMessage (rare)
          txHash = "mock_swap_fallback_" + Math.random().toString(36).substring(7);
        }
      }
    } catch (err: any) {
      this.setStatus(SwapStatus.FAILED);
      throw new Error(`User rejected signature or transaction failed: ${err.message}`);
    }

    this.setStatus(SwapStatus.BRIDGING);
    await new Promise((r) => setTimeout(r, 4000));
    
    this.setStatus(SwapStatus.FILLED);
    
    return txHash;
  }
}

export const swapService = new SwapService();
