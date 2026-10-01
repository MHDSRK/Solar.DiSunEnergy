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
 * Ensure the core leads table exists.
 * Production databases may not have had the migration script run yet, so
 * request handlers must be able to recover from a missing leads table.
 */
export async function ensureLeadTable() {
  if (leadTablePromise) return leadTablePromise

  leadTablePromise = (async () => {
    const sql = getSql()
    try {
      await sql`SELECT 1 FROM leads LIMIT 1`
      return
    } catch {
      await sql`CREATE TABLE IF NOT EXISTS leads (
        lead_id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        name TEXT,
        phone TEXT,
        district TEXT,
        area TEXT,
        connection_category TEXT,
        recommended_kw NUMERIC,
        kseb_consumer_number TEXT,
        remaining_transformer_capacity NUMERIC,
        lead_status TEXT NOT NULL DEFAULT 'NEW',
        source TEXT NOT NULL DEFAULT 'web'
      )`
    }
  })().catch((error) => {
    leadTablePromise = null
    throw error
  })

  return leadTablePromise
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
