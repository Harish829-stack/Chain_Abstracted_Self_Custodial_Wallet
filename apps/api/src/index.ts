import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from the monorepo root (two levels up from apps/api/src)
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import { verifyJwt, type JwtPayload } from "./middleware/auth.js";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: true,
});

server.get("/health", async (_request, _reply) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "caw-api",
  };
});

/**
 * Protected route — requires a valid Dynamic JWT.
 * Returns the authenticated user's identity from the token.
 * This is Step 5's exit criteria for the backend.
 */
server.get(
  "/me",
  { preHandler: [verifyJwt] },
  async (request, _reply) => {
    const payload = (request as typeof request & { jwtPayload: JwtPayload }).jwtPayload;
    return {
      userId: payload.sub,
      email: payload.email ?? null,
    };
  }
);

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await server.listen({ port, host });
  console.log(`🚀 API running at http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
