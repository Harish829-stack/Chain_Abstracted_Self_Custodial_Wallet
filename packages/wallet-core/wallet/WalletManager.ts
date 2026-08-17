import { IWalletProvider } from "./WalletProvider";
import { Address, TransactionRequest, VM } from "./types";
import { WalletNotConnectedError, TransactionFailedError } from "./errors";
import { EVMAdapter } from "../chains/evm/EVMAdapter";
import { chainRegistry } from "../chains/registry";

export class WalletManager {
  private provider: IWalletProvider | null = null;

  /**
   * Inject the vendor-specific provider (e.g., DynamicWalletProvider).
   */
  public setProvider(provider: IWalletProvider) {
    this.provider = provider;
  }

  private getProvider(): IWalletProvider {
    if (!this.provider) {
      throw new WalletNotConnectedError("No wallet provider is configured.");
    }
    return this.provider;
  }

  public async connect(): Promise<void> {
    await this.getProvider().connect();
  }

  public async disconnect(): Promise<void> {
    await this.getProvider().disconnect();
  }

  public async restoreSession(): Promise<boolean> {
    return await this.getProvider().restoreSession();
  }


  public async getAddress(vm: VM): Promise<Address> {
    return await this.getProvider().getAddress(vm);
  }

  /**
   * Fetch native balance for the given chain.
   * Automatically routes to the correct adapter based on chain VM.
   */
  public async getBalance(chainId: string): Promise<string> {
    const chain = chainRegistry.get(chainId);
    if (!chain) throw new Error(`Chain not found in registry: ${chainId}`);

    const address = await this.getAddress(chain.vm);

    if (chain.vm === VM.EVM) {
      const adapter = new EVMAdapter(chain);
      return adapter.getBalance(address);
    }
    throw new Error(`getBalance not implemented for VM: ${chain.vm}`);
  }

  public async signTransaction(tx: TransactionRequest): Promise<string> {
    try {
      return await this.getProvider().signTransaction(tx);
    } catch (error) {
      throw new TransactionFailedError("Failed to sign transaction", error);
    }
  }

  public async sendTransaction(tx: TransactionRequest): Promise<string> {
    try {
      return await this.getProvider().sendTransaction(tx);
    } catch (error) {
      throw new TransactionFailedError("Failed to send transaction", error);
    }
  }

  public async signMessage(message: string): Promise<string> {
    try {
      return await this.getProvider().signMessage(message);
    } catch (error) {
      throw new TransactionFailedError("Failed to sign message", error);
    }
  }
}
