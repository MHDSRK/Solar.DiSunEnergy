import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null

export function getSql() {
  if (sqlClient) return sqlClient
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured')
  sqlClient = neon(databaseUrl)
  return sqlClient
}

/** Database schema is provisioned by scripts/migrate-db.mjs. Request handlers do not run DDL. */
export async function ensureLeadTable() {
  return
}

export async function ensureAdminTasksTable() {
  return
}
