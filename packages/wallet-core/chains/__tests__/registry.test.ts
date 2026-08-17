import { describe, it, expect } from 'vitest';
import { chainRegistry } from "../registry";
import { VM } from "../../wallet/types";

describe('ChainRegistry', () => {
  it('contains Base Sepolia by default', () => {
    const config = chainRegistry.get("84532");
    expect(config).toBeDefined();
    expect(config.name).toBe("Base Sepolia");
    expect(config.vm).toBe(VM.EVM);
  });

  it('contains Solana Devnet by default using CAIP-2 ID', () => {
    const config = chainRegistry.get("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
    expect(config).toBeDefined();
    expect(config.name).toBe("Solana Devnet");
    expect(config.vm).toBe(VM.SOLANA);
  });

  it('throws when getting an unknown chain', () => {
    expect(() => {
      chainRegistry.get("unknown-chain");
    }).toThrow(/Chain config not found/);
  });

  it('returns all supported VMs', () => {
    const vms = chainRegistry.getSupportedVMs();
    expect(vms).toContain(VM.EVM);
    expect(vms).toContain(VM.SOLANA);
  });
});
