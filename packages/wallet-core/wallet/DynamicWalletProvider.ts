import { IWalletProvider } from "./WalletProvider";
import { Address, TransactionRequest, VM } from "./types";
import { WalletNotConnectedError, UserRejectedRequestError, UnsupportedChainError } from "./errors";

/**
 * Shape of the Dynamic SDK wallet object we need at runtime.
 * We use a structural interface instead of importing Dynamic SDK
 * directly into wallet-core, keeping this package vendor-agnostic.
 */
interface DynamicConnectedWallet {
  address: string;
  chain: string;
  connector?: {
    signMessage?: (message: string) => Promise<string>;
    sendTransaction?: (tx: unknown) => Promise<{ hash: string }>;
    signTransaction?: (tx: unknown) => Promise<string>;
  };
}

type OnConnectFn = () => Promise<void>;
type OnDisconnectFn = () => Promise<void>;

export class DynamicWalletProvider implements IWalletProvider {
  private wallet: DynamicConnectedWallet | null = null;
  private onConnectFn: OnConnectFn;
  private onDisconnectFn: OnDisconnectFn;

  constructor(opts: {
    onConnect: OnConnectFn;
    onDisconnect: OnDisconnectFn;
  }) {
    this.onConnectFn = opts.onConnect;
    this.onDisconnectFn = opts.onDisconnect;
  }

  /**
   * Called by the frontend when Dynamic reports a wallet is connected.
   * This decouples us from Dynamic's event system inside wallet-core.
   */
  public setWallet(wallet: DynamicConnectedWallet | null) {
    this.wallet = wallet;
  }

  async connect(): Promise<void> {
    await this.onConnectFn();
  }

  async disconnect(): Promise<void> {
    this.wallet = null;
    await this.onDisconnectFn();
  }

  async restoreSession(): Promise<boolean> {
    // Dynamic auto-restores sessions on page load if a session token exists.
    // The frontend will call setWallet() with the restored wallet, so we
    // just check if we already have one.
    return this.wallet !== null;
  }

  async getAddress(vm: VM): Promise<Address> {
    if (!this.wallet) throw new WalletNotConnectedError();
    if (vm === VM.EVM) {
      // Dynamic's EVM address
      return this.wallet.address;
    }
    // Solana support is added in Step 8 when @dynamic-labs/solana is installed
    throw new UnsupportedChainError("solana", vm);
  }

  async signMessage(message: string): Promise<string> {
    if (!this.wallet) throw new WalletNotConnectedError();
    const sign = this.wallet.connector?.signMessage;
    if (!sign) throw new WalletNotConnectedError("Connector does not support signMessage");
    try {
      return await sign(message);
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes("rejected")) {
        throw new UserRejectedRequestError();
      }
      throw e;
    }
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    if (!this.wallet) throw new WalletNotConnectedError();
    const sign = this.wallet.connector?.signTransaction;
    if (!sign) throw new WalletNotConnectedError("Connector does not support signTransaction");
    return await sign(tx);
  }

  async sendTransaction(tx: TransactionRequest): Promise<string> {
    if (!this.wallet) throw new WalletNotConnectedError();
    const send = this.wallet.connector?.sendTransaction;
    if (!send) throw new WalletNotConnectedError("Connector does not support sendTransaction");
    const result = await send(tx);
    return result.hash;
  }
}
