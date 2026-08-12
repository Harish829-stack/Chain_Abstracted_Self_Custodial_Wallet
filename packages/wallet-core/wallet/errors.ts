export class WalletNotConnectedError extends Error {
  constructor(message = "Wallet not connected") {
    super(message);
    this.name = "WalletNotConnectedError";
  }
}

export class UnsupportedChainError extends Error {
  constructor(chainId: string, vm: string) {
    super(`Unsupported chain ${chainId} for VM ${vm}`);
    this.name = "UnsupportedChainError";
  }
}

export class TransactionFailedError extends Error {
  constructor(message = "Transaction failed", public readonly originalError?: unknown) {
    super(message);
    this.name = "TransactionFailedError";
  }
}

export class UserRejectedRequestError extends Error {
  constructor(message = "User rejected the request") {
    super(message);
    this.name = "UserRejectedRequestError";
  }
}
