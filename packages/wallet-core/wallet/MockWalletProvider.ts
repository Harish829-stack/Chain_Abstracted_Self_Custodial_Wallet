import { IWalletProvider } from "./WalletProvider";
import { Address, TransactionRequest, VM } from "./types";
import { UnsupportedChainError } from "./errors";

export class MockWalletProvider implements IWalletProvider {
  public isConnected = false;

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async restoreSession(): Promise<boolean> {
    // Mock implementation of restoring a session
    if (this.isConnected) {
      return true;
    }
    return false;
  }


  async getAddress(vm: VM): Promise<Address> {
    if (vm === VM.EVM) {
      return "0xMockEVMAddress123456789012345678901234";
    } else if (vm === VM.SOLANA) {
      return "MockSolanaAddress111111111111111111111111";
    }
    throw new UnsupportedChainError("unknown", vm);
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    return "0xmock_signed_tx_blob";
  }

  async sendTransaction(tx: TransactionRequest): Promise<string> {
    // Return a fake transaction hash
    return "0xmocktxhash" + Date.now().toString(16);
  }

  async signMessage(message: string): Promise<string> {
    return "0xmock_signature_for_" + message.substring(0, 5);
  }
}
