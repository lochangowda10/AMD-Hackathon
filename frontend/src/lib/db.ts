import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Explicit datasource URL (with a local placeholder when DATABASE_URL is not
// set) so that importing this module can never throw. If the database is
// unreachable, individual queries fail and every route treats those failures
// as non-fatal - the app keeps working without persistence.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL ||
          'postgresql://placeholder:placeholder@localhost:5432/navia?connect_timeout=2',
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
