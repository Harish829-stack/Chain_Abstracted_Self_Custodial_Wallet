/**
 * Seed script — Step 2 exit criteria
 * Inserts a fake user + wallet + address, queries it back, then cleans up.
 * Run with: pnpm --filter @caw/api db:seed
 */

import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load root .env (prisma/ is inside apps/api, which is two levels from root)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient, VM } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── 1. Create a fake user ─────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      authProviderId: "test-auth-provider-id-001",
      wallets: {
        create: {
          addresses: {
            createMany: {
              data: [
                {
                  vm: VM.EVM,
                  chainId: "84532", // Base Sepolia
                  address: "0xDeAdBeEf0000000000000000000000000000CAFE",
                },
                {
                  vm: VM.SOLANA,
                  chainId: "solana-devnet",
                  address: "SoLFakeAddressXXXXXXXXXXXXXXXXXXXXXXXXXX",
                },
              ],
            },
          },
        },
      },
    },
    include: {
      wallets: {
        include: { addresses: true },
      },
    },
  });

  // ─── 2. Create a fake transaction ─────────────────────────────────────────
  const tx = await prisma.transaction.create({
    data: {
      userId: user.id,
      chainId: "84532",
      status: "PENDING",
      txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      metadata: { type: "native_transfer", amount: "1000000000000000" },
    },
  });

  // ─── 3. Query back and display ────────────────────────────────────────────
  console.log("✅ Created user:");
  console.log(`   id:             ${user.id}`);
  console.log(`   authProviderId: ${user.authProviderId}`);
  console.log(`   createdAt:      ${user.createdAt.toISOString()}`);

  console.log("\n✅ Wallet addresses:");
  for (const addr of user.wallets[0].addresses) {
    console.log(`   [${addr.vm}] chain=${addr.chainId} → ${addr.address}`);
  }

  console.log("\n✅ Transaction:");
  console.log(`   id:     ${tx.id}`);
  console.log(`   status: ${tx.status}`);
  console.log(`   txHash: ${tx.txHash}`);

  // ─── 4. Cleanup (keep DB clean between dev runs) ──────────────────────────
  await prisma.user.delete({ where: { id: user.id } });
  console.log("\n🧹 Cleaned up seed data.");
  console.log("\n✅ Step 2 deliverable verified — schema works end-to-end.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
