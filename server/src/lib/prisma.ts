import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/** Supabase's transaction pooler (port 6543) rejects prepared statements; Prisma only disables them when the URL carries `pgbouncer=true`. */
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || !url.includes(':6543') || url.includes('pgbouncer=true')) return url
  return `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`
}

const url = datasourceUrl()

export const prisma = globalForPrisma.prisma ?? new PrismaClient(url ? { datasourceUrl: url } : undefined)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
