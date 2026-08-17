import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
async function main() {
  await redis.flushall();
  console.log("Cleared Redis cache");
}
main().catch(console.error).finally(() => process.exit(0));
