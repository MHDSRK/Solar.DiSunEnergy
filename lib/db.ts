import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null
let leadTablePromise: Promise<void> | null = null

export function getSql() {
  if (sqlClient) return sqlClient
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured')
  sqlClient = neon(databaseUrl)
  return sqlClient
}

/**
 * Database schema is provisioned by `pnpm db:migrate`, not by request handlers.
 * Kept as a no-op for compatibility with existing callers during the migration.
 */
export async function ensureLeadTable() {
  return Promise.resolve()
}
