import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/prisma.js";

describe("Database Integration Tests", () => {
  // Use a predictable test ID so we can clean it up easily
  const testUserId = "test-integration-user-" + Date.now();
  let walletId: string;

  // We don't drop the entire DB in afterAll so we don't destroy local dev data,
  // we just clean up the data this specific test creates.
  afterAll(async () => {
    // Delete cascading downward: WalletAddresses -> Wallets -> Users (Prisma handles cascading if configured, 
    // but we can manually delete to be safe)
    await prisma.walletAddress.deleteMany({
      where: { wallet: { userId: testUserId } }
    });
    await prisma.wallet.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    }).catch(() => {}); // catch in case the test failed early
  });

  describe("User and Wallet Creation", () => {
    it("should create a user successfully", async () => {
      const user = await prisma.user.create({
        data: {
          id: testUserId,
          authProviderId: "integration-auth-id",
        }
      });
      expect(user.id).toBe(testUserId);
      expect(user.authProviderId).toBe("integration-auth-id");
    });

    it("should create a wallet linked to the user", async () => {
      const wallet = await prisma.wallet.create({
        data: {
          userId: testUserId,
        }
      });
      expect(wallet.id).toBeDefined();
      expect(wallet.userId).toBe(testUserId);
      walletId = wallet.id;
    });

    it("should create EVM and Solana wallet addresses", async () => {
      expect(walletId).toBeDefined(); // Safety check

      const addresses = await prisma.walletAddress.createMany({
        data: [
          {
            walletId,
            vm: "EVM",
            chainId: "84532",
            address: "0x111122223333444455556666777788889999aaaa",
          },
          {
            walletId,
            vm: "SOLANA",
            chainId: "solana-devnet",
            address: "SoLIntegrationTestAddress11111111111111111",
          }
        ]
      });

      expect(addresses.count).toBe(2);

      const fetched = await prisma.walletAddress.findMany({
        where: { walletId }
      });
      expect(fetched.length).toBe(2);
      expect(fetched.some((a: any) => a.vm === "EVM")).toBe(true);
      expect(fetched.some((a: any) => a.vm === "SOLANA")).toBe(true);
    });
  });
});
