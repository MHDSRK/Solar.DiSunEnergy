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
 * request handlers must be able to recover from a missing or incomplete table.
 */
export async function ensureLeadTable() {
  if (leadTablePromise) return leadTablePromise

  leadTablePromise = (async () => {
    const sql = getSql()
    try {
      await sql`SELECT 1 FROM leads LIMIT 1`
    } catch {
      await sql`CREATE TABLE IF NOT EXISTS leads (
        lead_id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        name TEXT,
        phone TEXT,
        district TEXT,
        area TEXT,
        bill NUMERIC,
        monthly_kwh NUMERIC,
        connection_category TEXT,
        recommended_kw NUMERIC,
        setup_cost NUMERIC,
        subsidy NUMERIC,
        financing_amount NUMERIC,
        customer_contribution NUMERIC,
        kseb_consumer_number TEXT,
        kseb_district TEXT,
        kseb_section TEXT,
        transformer TEXT,
        feasibility_status TEXT,
        requested_kw NUMERIC,
        remaining_transformer_capacity NUMERIC,
        kseb_allowed_capacity_kw NUMERIC,
        kseb_feasibility_issued_kw NUMERIC,
        kseb_grid_connected_kw NUMERIC,
        kseb_checked_at TIMESTAMPTZ,
        lead_status TEXT NOT NULL DEFAULT 'NEW',
        source TEXT NOT NULL DEFAULT 'web',
        privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
        privacy_consent_at TIMESTAMPTZ,
        terms_version TEXT,
        calculated_at TIMESTAMPTZ,
        feasibility_checked_at TIMESTAMPTZ,
        documents_completed_at TIMESTAMPTZ,
        site_visit_booked_at TIMESTAMPTZ,
        converted_at TIMESTAMPTZ
      )`
    }

    // Also repair databases where an older/minimal leads table already exists.
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS district TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS area TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bill NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_kwh NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS connection_category TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS recommended_kw NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS setup_cost NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS subsidy NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS financing_amount NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_contribution NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_consumer_number TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_district TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_section TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS transformer TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS feasibility_status TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS requested_kw NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS remaining_transformer_capacity NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_allowed_capacity_kw NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_feasibility_issued_kw NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_grid_connected_kw NUMERIC`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_checked_at TIMESTAMPTZ`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'NEW'`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web'`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT FALSE`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS terms_version TEXT`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS feasibility_checked_at TIMESTAMPTZ`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS documents_completed_at TIMESTAMPTZ`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS site_visit_booked_at TIMESTAMPTZ`
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ`
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
