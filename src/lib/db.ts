import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot reloads modules on every change, which would
 * otherwise open a new connection pool each time. Caching the client on
 * globalThis keeps a single instance across reloads. In production the
 * module is loaded once per server process, so no caching is needed.
 *
 * The client reads DATABASE_URL from the environment automatically. The
 * constructor does not connect, so importing this module during `next build`
 * is safe even when DATABASE_URL is unset.
 */
export const db: PrismaClient =
  globalThis.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}