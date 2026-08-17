import { Connection, PublicKey } from "@solana/web3.js";
import { ChainConfig } from "../types";

export class SolanaAdapter {
  private connection: Connection;
  public config: ChainConfig;

  constructor(config: ChainConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, "confirmed");
  }

  /**
   * Check the transaction receipt on Solana and return its status
   * "confirmed" | "failed" | "pending"
   */
  async getTransactionStatus(txHash: string): Promise<"confirmed" | "failed" | "pending"> {
    try {
      // Solana uses base58 strings for signatures (tx hashes)
      const signatureStatus = await this.connection.getSignatureStatus(txHash, { searchTransactionHistory: true });
      
      const status = signatureStatus.value;
      if (!status) {
        return "pending";
      }

      if (status.err) {
        return "failed";
      }

      // If confirmation status is finalized or confirmed, consider it done
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
        return "confirmed";
      }

      return "pending";
    } catch (error) {
      console.error(`[SolanaAdapter] Error checking tx ${txHash}:`, error);
      return "pending";
    }
  }
}
