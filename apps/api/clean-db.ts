import { prisma } from "./src/lib/prisma.js";
async function main() {
  await prisma.walletAddress.deleteMany({});
  console.log("Cleared wallet addresses");
}
main().catch(console.error).finally(() => prisma.$disconnect());
