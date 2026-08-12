import { PrismaClient } from "@prisma/client";
import { PgAdapter } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load root .env (apps/api is two levels deep from root)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your .env file at the project root."
    );
  }
  const adapter = new PgAdapter({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// Singleton pattern — prevents exhausting DB connections during hot-reload in dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
