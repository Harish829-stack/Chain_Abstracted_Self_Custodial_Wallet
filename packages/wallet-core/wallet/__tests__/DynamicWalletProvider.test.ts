import { describe, it, expect, vi, beforeEach } from "vitest";
import { DynamicWalletProvider } from "../DynamicWalletProvider";
import { VM } from "../types";
import { WalletNotConnectedError, UnsupportedChainError, UserRejectedRequestError } from "../errors";

describe("DynamicWalletProvider", () => {
  let provider: DynamicWalletProvider;
  let mockOnConnect: any;
  let mockOnDisconnect: any;

  beforeEach(() => {
    mockOnConnect = vi.fn().mockResolvedValue(undefined);
    mockOnDisconnect = vi.fn().mockResolvedValue(undefined);

    provider = new DynamicWalletProvider({
      onConnect: mockOnConnect,
      onDisconnect: mockOnDisconnect,
    });
  });

  describe("Lifecycle", () => {
    it("connect() triggers onConnect callback", async () => {
      await provider.connect();
      expect(mockOnConnect).toHaveBeenCalled();
    });

    it("disconnect() triggers onDisconnect callback and clears wallet", async () => {
      provider.setWallet({ address: "0x123", chain: "eip155:1" });
      await provider.disconnect();
      expect(mockOnDisconnect).toHaveBeenCalled();
      
      await expect(provider.getAddress(VM.EVM)).rejects.toThrow(WalletNotConnectedError);
    });

    it("restoreSession() returns true if wallet is set, false otherwise", async () => {
      expect(await provider.restoreSession()).toBe(false);
      provider.setWallet({ address: "0x123", chain: "eip155:1" });
      expect(await provider.restoreSession()).toBe(true);
    });
  });

  describe("getAddress", () => {
    it("throws if not connected", async () => {
      await expect(provider.getAddress(VM.EVM)).rejects.toThrow(WalletNotConnectedError);
    });

    it("throws UnsupportedChainError for SOLANA currently", async () => {
      provider.setWallet({ address: "0x123", chain: "eip155:1" });
      await expect(provider.getAddress(VM.SOLANA)).rejects.toThrow(UnsupportedChainError);
    });

    it("returns address for EVM", async () => {
      provider.setWallet({ address: "0x123", chain: "eip155:1" });
      const address = await provider.getAddress(VM.EVM);
      expect(address).toBe("0x123");
    });
  });

  describe("Signing and Sending", () => {
    const mockConnector = {
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(),
    };

    beforeEach(() => {
      provider.setWallet({
        address: "0x123",
        chain: "eip155:1",
        connector: mockConnector,
      });
      vi.clearAllMocks();
    });

    it("signMessage delegates correctly", async () => {
      mockConnector.signMessage.mockResolvedValue("0xsignature");
      const sig = await provider.signMessage("Hello World");
      expect(sig).toBe("0xsignature");
      expect(mockConnector.signMessage).toHaveBeenCalledWith("Hello World");
    });

    it("signMessage throws UserRejectedRequestError on rejection", async () => {
      mockConnector.signMessage.mockRejectedValue(new Error("User rejected request"));
      await expect(provider.signMessage("Hello")).rejects.toThrow(UserRejectedRequestError);
    });

    it("signTransaction delegates correctly", async () => {
      mockConnector.signTransaction.mockResolvedValue("0xsignedtx");
      const sig = await provider.signTransaction({ to: "0x456", value: "100" } as any);
      expect(sig).toBe("0xsignedtx");
    });

    it("sendTransaction extracts hash correctly", async () => {
      mockConnector.sendTransaction.mockResolvedValue({ hash: "0xhash" });
      const hash = await provider.sendTransaction({ to: "0x456", value: "100" } as any);
      expect(hash).toBe("0xhash");
    });
  });
});
