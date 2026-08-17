import { prisma } from "./src/lib/prisma.js";
async function main() {
  const users = await prisma.user.findMany({ include: { wallets: { include: { addresses: true } } } });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
