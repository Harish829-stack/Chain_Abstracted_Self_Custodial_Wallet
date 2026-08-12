import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load the root .env file (two levels up from apps/api)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env file at the project root."
  );
}

// Append sslmode=require if not already present (required by Supabase)
const urlWithSsl = connectionString.includes("sslmode")
  ? connectionString
  : `${connectionString}?sslmode=require`;

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  datasource: {
    url: urlWithSsl,
  },
  migrate: {
    adapter: () => {
      const pool = new Pool({
        connectionString: urlWithSsl,
        ssl: { rejectUnauthorized: false },
      });
      return new PrismaPg(pool);
    },
  },
});
