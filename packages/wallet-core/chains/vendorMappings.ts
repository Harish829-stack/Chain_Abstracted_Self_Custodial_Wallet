import { ChainId } from "../wallet/types";

/**
 * Supported vendors that require specific chain ID formats.
 */
export enum Vendor {
  LIFI = "LIFI",
  DYNAMIC = "DYNAMIC",
  ZERION = "ZERION",
}

/**
 * Maps our internal ChainId to a vendor-specific ChainId.
 * For example, EVM chains typically share the numeric ID,
 * but Solana varies wildly between vendors.
 */
export function toVendorChainId(internalId: ChainId, vendor: Vendor): string {
  switch (vendor) {
    case Vendor.LIFI:
      // LI.FI uses 1151111081099710 for Solana
      if (internalId === "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1") {
        return "1151111081099710";
      }
      return internalId;

    case Vendor.DYNAMIC:
      // Assuming Dynamic uses the genesis hash or a different internal enum
      // We will fill this in when implementing Dynamic
      return internalId;

    case Vendor.ZERION:
      // We will fill this in when implementing Zerion
      return internalId;

    default:
      return internalId;
  }
}
