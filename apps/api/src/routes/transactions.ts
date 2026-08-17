import { FastifyInstance } from "fastify";
import { verifyJwt, JwtPayload } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { TransactionStatus } from "@prisma/client";

export default async function transactionRoutes(server: FastifyInstance) {
  // All transaction routes are protected
  server.addHook("preHandler", verifyJwt);

  // Helper to get internal user
  const getUser = async (authProviderId: string) => {
    const user = await prisma.user.findUnique({ where: { authProviderId } });
    if (!user) {
      // Auto-create user if missing in DB to simplify flow
      return await prisma.user.create({ data: { authProviderId } });
    }
    return user;
  };

  server.post<{
    Body: { chainId: string; metadata?: any };
  }>("/", async (request, reply) => {
    const payload = (request as any).jwtPayload as JwtPayload;
    const user = await getUser(payload.sub);

    const { chainId, metadata } = request.body;

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        chainId,
        status: TransactionStatus.CREATED,
        metadata: metadata ?? {},
      },
    });

    return reply.status(201).send(tx);
  });

  server.patch<{
    Params: { id: string };
    Body: { status: TransactionStatus; txHash?: string };
  }>("/:id", async (request, reply) => {
    const payload = (request as any).jwtPayload as JwtPayload;
    const user = await getUser(payload.sub);
    const { id } = request.params;
    const { status, txHash } = request.body;

    // Verify ownership
    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return reply.status(404).send({ error: "Transaction not found" });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        ...(txHash ? { txHash } : {}),
      },
    });

    return reply.send(updated);
  });

  server.get("/", async (request, reply) => {
    const payload = (request as any).jwtPayload as JwtPayload;
    const user = await getUser(payload.sub);

    const txs = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return reply.send(txs);
  });
}
