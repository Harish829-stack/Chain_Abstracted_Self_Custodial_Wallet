import { BalanceService } from "./src/services/BalanceService.js";
import { prisma } from "./src/lib/prisma.js";

async function main() {
  const users = await prisma.user.findMany({ include: { wallets: { include: { addresses: true } } } });
  if (users.length > 0) {
    console.log("Addresses:", users[0].wallets[0]?.addresses);
    const balance = await BalanceService.getUnifiedBalance(users[0].id);
    console.log("Balance:", balance);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
