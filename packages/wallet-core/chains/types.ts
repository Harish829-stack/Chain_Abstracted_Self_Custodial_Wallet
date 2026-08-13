import { ChainId, VM } from "../wallet/types";

export interface NativeCurrency {
  symbol: string;
  decimals: number;
}

export interface ChainConfig {
  id: ChainId;
  name: string;
  vm: VM;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: NativeCurrency;
  supportsGasSponsorship: boolean;
  supportsSwaps: boolean;
}
