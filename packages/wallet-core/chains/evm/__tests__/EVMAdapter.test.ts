import { describe, it, expect, vi, beforeEach } from "vitest";
import { EVMAdapter } from "../EVMAdapter";
import { VM } from "../../../wallet/types";
import { IWalletProvider } from "../../../wallet/WalletProvider";
import fc from "fast-check";
import * as viem from "viem";

// Mock viem so we can control the publicClient behavior
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBalance: vi.fn(),
      getTransactionReceipt: vi.fn(),
    })),
  };
});

const mockChain = {
  id: "84532",
  name: "Base Sepolia",
  vm: VM.EVM,
  rpcUrl: "https://mock-rpc.com",
  explorerUrl: "https://mock-explorer.com",
  nativeCurrency: { symbol: "ETH", decimals: 18 },
  supportsGasSponsorship: true,
  supportsSwaps: true,
};

describe("EVMAdapter", () => {
  let adapter: EVMAdapter;
  let mockPublicClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new EVMAdapter(mockChain);
    // Grab the mocked instance returned by createPublicClient
    mockPublicClient = vi.mocked(viem.createPublicClient).mock.results[0].value;
  });

  describe("Constructor", () => {
    it("should throw if initialized with a non-EVM chain", () => {
      const invalidChain = { ...mockChain, vm: VM.SOLANA };
      expect(() => new EVMAdapter(invalidChain)).toThrow(/only supports EVM/);
    });
  });

  describe("getBalance", () => {
    it("should fetch and format balance correctly", async () => {
      mockPublicClient.getBalance.mockResolvedValueOnce(1500000000000000000n); // 1.5 ETH
      const balance = await adapter.getBalance("0x1234567890123456789012345678901234567890");
      expect(balance).toBe("1.5");
      expect(mockPublicClient.getBalance).toHaveBeenCalledWith({
        address: "0x1234567890123456789012345678901234567890",
      });
    });
  });

  describe("buildTransaction", () => {
    it("should build a valid transaction request", () => {
      const tx = adapter.buildTransaction({
        to: "0x1234567890123456789012345678901234567890",
        amountEther: "1.5",
        data: "0xdeadbeef",
      });
      expect(tx).toEqual({
        vm: VM.EVM,
        chainId: "84532",
        to: "0x1234567890123456789012345678901234567890",
        value: "1500000000000000000",
        data: "0xdeadbeef",
      });
    });

    describe("Fuzzing edge cases", () => {
      it("should reject invalid EVM addresses reliably", () => {
        fc.assert(
          fc.property(fc.string(), (randomString) => {
            fc.pre(!randomString.startsWith("0x") || randomString.length !== 42);
            expect(() =>
              adapter.buildTransaction({
                to: randomString,
                amountEther: "1.0",
              })
            ).toThrow(/Invalid EVM address/);
          })
        );
      });

      it("should safely reject non-positive amounts or invalid number strings", () => {
        fc.assert(
          fc.property(fc.string(), (invalidAmount) => {
            // fast-check might generate valid numbers, skip them
            let isPositiveNumber = false;
            try {
              const num = Number(invalidAmount);
              if (!isNaN(num) && num > 0) isPositiveNumber = true;
            } catch {}

            fc.pre(!isPositiveNumber);
            
            expect(() =>
              adapter.buildTransaction({
                to: "0x1234567890123456789012345678901234567890",
                amountEther: invalidAmount,
              })
            ).toThrow(); // Should throw parse errors or amount <= 0 errors
          })
        );
      });
    });
  });

  describe("sendTransaction", () => {
    it("should delegate to the wallet provider", async () => {
      const mockProvider = {
        sendTransaction: vi.fn().mockResolvedValue("0xtxhash"),
      } as unknown as IWalletProvider;

      const tx = adapter.buildTransaction({
        to: "0x1234567890123456789012345678901234567890",
        amountEther: "0.1",
      });

      const hash = await adapter.sendTransaction(tx, mockProvider);
      expect(hash).toBe("0xtxhash");
      expect(mockProvider.sendTransaction).toHaveBeenCalledWith(tx);
    });
  });

  describe("getTransactionStatus", () => {
    it("should return confirmed on success", async () => {
      mockPublicClient.getTransactionReceipt.mockResolvedValueOnce({ status: "success" });
      const status = await adapter.getTransactionStatus("0xhash");
      expect(status).toBe("confirmed");
    });

    it("should return failed on reverted tx", async () => {
      mockPublicClient.getTransactionReceipt.mockResolvedValueOnce({ status: "reverted" });
      const status = await adapter.getTransactionStatus("0xhash");
      expect(status).toBe("failed");
    });

    it("should return pending if receipt is null or throws", async () => {
      mockPublicClient.getTransactionReceipt.mockResolvedValueOnce(null);
      const status1 = await adapter.getTransactionStatus("0xhash");
      expect(status1).toBe("pending");

      mockPublicClient.getTransactionReceipt.mockRejectedValueOnce(new Error("Not found"));
      const status2 = await adapter.getTransactionStatus("0xhash");
      expect(status2).toBe("pending");
    });
  });
});
