import Fastify from "fastify";
import cors from "@fastify/cors";

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

const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await server.listen({ port, host });
  console.log(`🚀 API running at http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
