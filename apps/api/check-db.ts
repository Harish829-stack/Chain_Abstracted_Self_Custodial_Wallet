import { prisma } from "./src/lib/prisma.js";

async function main() {
  const txs = await prisma.transaction.findMany();
  console.log(txs.map(t => `${t.id} | ${t.chainId} | ${t.status} | ${t.txHash ? t.txHash.slice(0, 15) : 'null'}`).join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
