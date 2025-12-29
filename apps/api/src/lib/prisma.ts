import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Configure Prisma with connection pool settings
// For Supabase/Neon, add ?pgbouncer=true&connection_limit=1 to DATABASE_URL
export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// Graceful shutdown - disconnect on process exit
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
