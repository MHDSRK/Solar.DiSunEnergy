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

export async function ensureAdminTasksTable() {
  const sql = getSql()
  await sql`CREATE TABLE IF NOT EXISTS admin_tasks (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    note TEXT,
    task_date DATE NOT NULL DEFAULT CURRENT_DATE,
    number TEXT,
    place TEXT,
    stage TEXT,
    plant TEXT,
    payment TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  )`
}
