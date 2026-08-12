import { describe, it, expect, beforeEach } from 'vitest';
import { WalletManager } from '../WalletManager';
import { MockWalletProvider } from '../MockWalletProvider';
import { VM } from '../types';
import { WalletNotConnectedError } from '../errors';

describe('WalletManager', () => {
  let walletManager: WalletManager;
  let mockProvider: MockWalletProvider;

  beforeEach(() => {
    walletManager = new WalletManager();
    mockProvider = new MockWalletProvider();
  });

  it('throws an error if no provider is set', async () => {
    await expect(walletManager.connect()).rejects.toThrow(WalletNotConnectedError);
  });

  it('connects via the provider', async () => {
    walletManager.setProvider(mockProvider);
    expect(mockProvider.isConnected).toBe(false);
    
    await walletManager.connect();
    expect(mockProvider.isConnected).toBe(true);
  });

  it('gets the correct addresses from the provider', async () => {
    walletManager.setProvider(mockProvider);
    
    const evmAddr = await walletManager.getAddress(VM.EVM);
    expect(evmAddr).toBe("0xMockEVMAddress123456789012345678901234");
    
    const solAddr = await walletManager.getAddress(VM.SOLANA);
    expect(solAddr).toBe("MockSolanaAddress111111111111111111111111");
  });

  it('sends a transaction via the provider', async () => {
    walletManager.setProvider(mockProvider);
    
    const txHash = await walletManager.sendTransaction({
      vm: VM.EVM,
      chainId: "84532",
      to: "0xTest",
      value: "100"
    });
    
    expect(txHash).toMatch(/^0xmocktxhash/);
  });
});
