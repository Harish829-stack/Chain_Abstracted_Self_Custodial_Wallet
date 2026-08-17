const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.transaction.updateMany({
    where: { chainId: '103' },
    data: { chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' }
  });
  console.log(`Updated ${count.count} transactions in the DB.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
