import { EventEmitter } from "events";
import { buildAndExecuteEVMIntent } from "./builders/EVMIntentBuilder";
import { buildAndExecuteSVMIntent } from "./builders/SVMIntentBuilder";

export enum SwapStatus {
  IDLE = "IDLE",
  FETCHING_QUOTE = "FETCHING_QUOTE",
  QUOTE_RECEIVED = "QUOTE_RECEIVED",
  USER_CONFIRMED = "USER_CONFIRMED",
  SIGNING_INTENT = "SIGNING_INTENT",
  BROADCASTING = "BROADCASTING",
  AWAITING_SOLVER = "AWAITING_SOLVER",
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
    
    // Simulate Eco Routes Quoter API call
    await new Promise((r) => setTimeout(r, 1500));
    
    // Mocking a highly-liquid stablecoin route quote
    this.currentQuote = {
      fromChain,
      toChain,
      fromAmount: amount,
      toAmount: (parseFloat(amount) * 0.995).toString(), // 0.5% solver fee/spread
      estimatedDurationSeconds: 5,
    };

    this.setStatus(SwapStatus.QUOTE_RECEIVED);
    return this.currentQuote;
  }

  public async executeSwap(wallet: any, toAddress?: string): Promise<string> {
    if (!this.currentQuote) throw new Error("No quote available to execute");
    
    this.setStatus(SwapStatus.USER_CONFIRMED);
    await new Promise((r) => setTimeout(r, 500));
    
    this.setStatus(SwapStatus.SIGNING_INTENT);
    
    let txHash: string;
    let intentPayload: any;
    
    try {
      const destChainId = this.currentQuote.toChain;
      
      // If Solana Devnet
      if (destChainId === "103") {
        const result = await buildAndExecuteSVMIntent(wallet, this.currentQuote, toAddress);
        txHash = result.txHash;
        intentPayload = { vmType: "SVM", payload: result.intentPayload };
      } else {
        const result = await buildAndExecuteEVMIntent(wallet, this.currentQuote, toAddress);
        txHash = result.txHash;
        intentPayload = { vmType: "EVM", payload: result.intentPayload };
      }
    } catch (err: any) {
      this.setStatus(SwapStatus.FAILED);
      throw new Error(`User rejected intent execution: ${err.message}`);
    }

    this.setStatus(SwapStatus.BROADCASTING);
    await new Promise((r) => setTimeout(r, 1000));
    console.log("[Eco Routes] Broadcasted publishAndFund transaction:", {
      quote: this.currentQuote,
      txHash,
      intentPayload
    });
    
    // We attach the intentPayload to the txHash as a delimited string so the UI can send it to the backend DB metadata easily.
    // In a real app we'd pass it back more cleanly, but this works for the mock loop.
    return txHash + "|_INTENT_|" + JSON.stringify(intentPayload, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
  }
}

export const swapService = new SwapService();
