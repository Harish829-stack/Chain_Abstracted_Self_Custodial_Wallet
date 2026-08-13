import { IWalletProvider } from "./WalletProvider";
import { Address, TransactionRequest, VM } from "./types";
import { WalletNotConnectedError, TransactionFailedError } from "./errors";

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
