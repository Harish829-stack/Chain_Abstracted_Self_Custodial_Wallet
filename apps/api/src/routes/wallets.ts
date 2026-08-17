import { FastifyInstance } from "fastify";
import { verifyJwt, JwtPayload } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { VM } from "@prisma/client";
import { BalanceService } from "../services/BalanceService.js";

interface SyncWalletRequest {
  addresses: {
    address: string;
    chain: string; // e.g. "EVM", "SOLANA"
  }[];
}

export default async function walletRoutes(server: FastifyInstance) {
  // All wallet routes are protected
  server.addHook("preHandler", verifyJwt);

  // Helper to get internal user
  const getUser = async (authProviderId: string) => {
    let user = await prisma.user.findUnique({ where: { authProviderId } });
    if (!user) {
      user = await prisma.user.create({ data: { authProviderId } });
    }
    return user;
  };

  /**
   * POST /wallets/sync
   * Upserts the connected wallets and addresses from the frontend.
   */
  server.post<{ Body: SyncWalletRequest }>("/sync", async (request, reply) => {
    const payload = (request as any).jwtPayload as JwtPayload;
    const user = await getUser(payload.sub);
    const { addresses } = request.body;

    if (!Array.isArray(addresses)) {
      return reply.status(400).send({ error: "addresses must be an array" });
    }

    // Get or create the single wallet for this user
    let wallet = await prisma.wallet.findFirst({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: user.id },
      });
    }

    const createdAddresses = [];
    
    // Upsert each address
    for (const addr of addresses) {
      if (!addr.address) continue;
      
      const isEvm = addr.address.startsWith("0x");
      const vm = isEvm ? VM.EVM : VM.SOLANA;
      
      // Defaulting chain_id to empty for generic sync, or you can map it
      // if the frontend passes the specific network
      const chainId = vm === VM.SOLANA ? "solana-mainnet" : "1"; 

      try {
        const record = await prisma.walletAddress.upsert({
          where: {
            walletId_vm_chainId: {
              walletId: wallet.id,
              vm,
              chainId,
            }
          },
          update: { address: addr.address },
          create: {
            walletId: wallet.id,
            vm,
            chainId,
            address: addr.address,
          }
        });
        createdAddresses.push(record);
      } catch (e) {
        server.log.error(`Failed to sync address ${addr.address}: ${e}`);
      }
    }

    return reply.send({ success: true, count: createdAddresses.length });
  });

  /**
   * GET /wallets/portfolio
   * Retrieves the unified USD balance and chain distribution.
   */
  server.get("/portfolio", async (request, reply) => {
    const payload = (request as any).jwtPayload as JwtPayload;
    const user = await getUser(payload.sub);

    try {
      const portfolio = await BalanceService.getUnifiedBalance(user.id);
      return reply.send(portfolio);
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch unified balance" });
    }
  });
}
