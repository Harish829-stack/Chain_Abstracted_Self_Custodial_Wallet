import { EventEmitter } from "events";
import { parseEther } from "viem";

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
      if ("signTypedData" in wallet || "getWalletClient" in wallet) {
        const walletClient = "getWalletClient" in wallet ? await wallet.getWalletClient() : wallet;
        const sourceChainId = this.currentQuote.fromChain;
        const destChainId = this.currentQuote.toChain;

        const sourcePortalAddress = "0x154115F055A5Ff2584ABcB013C6832F19F0D8bc5" as `0x${string}`;
        const destPortalAddress = "0x154115F055A5Ff2584ABcB013C6832F19F0D8bc5" as `0x${string}`;
        const hyperProverAddress = "0x3d2D283731a900547Ef065057dBf704B6fec19C7" as `0x${string}`;
        
        const randomSalt = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("") as `0x${string}`;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

        intentPayload = {
          destination: BigInt(this.currentQuote.toChain),
          route: {
            salt: randomSalt,
            deadline: deadline,
            portal: destPortalAddress,
            nativeAmount: parseEther(this.currentQuote.toAmount), // User wants this amount on destination
            tokens: [],
            calls: [
              {
                target: (toAddress || wallet.address) as `0x${string}`,
                data: "0x",
                value: parseEther(this.currentQuote.toAmount)
              }
            ]
          },
          reward: {
            deadline: deadline,
            creator: wallet.address as `0x${string}`,
            prover: hyperProverAddress,
            nativeAmount: parseEther(this.currentQuote.fromAmount), // User pays this amount on source
            tokens: []
          }
        };

        const PortalAbi = (await import("./PortalAbi.json")).default;

        if (walletClient.writeContract) {
          txHash = await walletClient.writeContract({
            address: sourcePortalAddress,
            abi: PortalAbi,
            functionName: "publishAndFund",
            args: [intentPayload, false], // Intent, allowPartial
            value: intentPayload.reward.nativeAmount // Escrow the ETH reward on source chain
          });
        } else {
           throw new Error("Wallet does not support writeContract");
        }
      } else {
        throw new Error("Solana is not supported in this on-chain intent flow yet");
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
