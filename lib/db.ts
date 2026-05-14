import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma() {
  const url = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "file:")
  const adapter = new PrismaLibSql({ url })
  return new PrismaClient({ adapter } as any)
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
