import { Address, TransactionRequest, VM } from "./types";

/**
 * Interface that any vendor (Dynamic, Privy, Openfort) must implement.
 * This prevents vendor lock-in by forcing the application to rely only on these methods.
 */
export interface IWalletProvider {
  /** Connect or login the user */
  connect(): Promise<void>;
  
  /** Disconnect or logout the user */
  disconnect(): Promise<void>;
  
  /** Get the address for a specific Virtual Machine (EVM, Solana) */
  getAddress(vm: VM): Promise<Address>;
  
  /** Sign a transaction without broadcasting it */
  signTransaction(tx: TransactionRequest): Promise<string>;
  
  /** Sign and broadcast a transaction, returning the transaction hash */
  sendTransaction(tx: TransactionRequest): Promise<string>;
  
  /** Sign an arbitrary string message */
  signMessage(message: string): Promise<string>;
}
