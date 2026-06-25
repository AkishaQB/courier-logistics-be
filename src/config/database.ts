import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

// Singleton pattern:
// During development, ts-node-dev restarts your app on every file change.
// Without this pattern, each restart would create a NEW PrismaClient instance
// (a new database connection pool) — but the OLD one never gets closed.
// This leaks connections until PostgreSQL refuses new ones.
//
// The fix: store the instance on `globalThis` (a Node.js global that survives
// module reloads). On restart, we reuse the existing client instead of
// creating a new one.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
