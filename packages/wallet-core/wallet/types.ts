export type Address = string;
export type ChainId = string;

// Must match the DB enum
export enum VM {
  EVM = "EVM",
  SOLANA = "SOLANA",
}

export interface TransactionRequest {
  vm: VM;
  chainId: ChainId;
  to: Address;
  value?: string; // native amount in wei/lamports
  data?: string;  // calldata/instruction data
}

export interface TransactionResponse {
  hash: string;
}
