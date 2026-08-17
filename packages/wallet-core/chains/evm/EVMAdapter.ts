import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Hash,
  type PublicClient,
  type Address as ViemAddress,
} from "viem";
import { type ChainConfig } from "../types";
import { type IWalletProvider } from "../../wallet/WalletProvider";
import { type Address, type TransactionRequest, VM } from "../../wallet/types";

/**
 * Chain-specific read/write adapter for EVM chains.
 *
 * Responsibilities:
 *  - Read from chain via viem's PublicClient (balance, tx status)
 *  - Build transaction objects
 *  - Delegate signing to the IWalletProvider (which owns the key)
 *  - Broadcast signed transactions via viem's WalletClient
 *
 * This adapter never touches a private key. All signing goes
 * through the injected provider (DynamicWalletProvider in prod,
 * MockWalletProvider in tests).
 */
export class EVMAdapter {
  private readonly publicClient: PublicClient;
  private readonly chain: ChainConfig;

  constructor(chain: ChainConfig) {
    if (chain.vm !== VM.EVM) {
      throw new Error(`EVMAdapter only supports EVM chains, got: ${chain.vm}`);
    }
    this.chain = chain;
    this.publicClient = createPublicClient({
      transport: http(chain.rpcUrl),
    });
  }

  /**
   * Fetch the native token balance (ETH/similar) in ether units (string).
   */
  async getBalance(address: Address): Promise<string> {
    const raw = await this.publicClient.getBalance({
      address: address as ViemAddress,
    });
    return formatEther(raw);
  }

  /**
   * Build a validated TransactionRequest for the given parameters.
   * Validates the destination address and amount before handing off to sendTransaction.
   */
  buildTransaction(opts: {
    to: Address;
    amountEther: string;
    data?: `0x${string}`;
  }): TransactionRequest {
    if (!opts.to.startsWith("0x") || opts.to.length !== 42) {
      throw new Error(`Invalid EVM address: ${opts.to}`);
    }
    const parsed = parseEther(opts.amountEther);
    if (parsed <= BigInt(0)) {
      throw new Error("Amount must be greater than 0");
    }
    return {
      vm: VM.EVM,
      chainId: this.chain.id,
      to: opts.to,
      value: parsed.toString(), // wei as string
      data: opts.data,
    };
  }

  /**
   * Sign and broadcast a transaction through the provider.
   * Returns the transaction hash.
   */
  async sendTransaction(
    tx: TransactionRequest,
    provider: IWalletProvider
  ): Promise<Hash> {
    const hash = await provider.sendTransaction(tx);
    return hash as Hash;
  }

  /**
   * Poll for transaction confirmation status.
   * Returns: 'pending' | 'confirmed' | 'failed'
   */
  async getTransactionStatus(
    hash: Hash
  ): Promise<"pending" | "confirmed" | "failed"> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash });
      if (!receipt) return "pending";
      return receipt.status === "success" ? "confirmed" : "failed";
    } catch {
      // Receipt not yet available = still pending
      return "pending";
    }
  }
}
