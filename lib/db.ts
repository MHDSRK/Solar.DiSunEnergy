import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null
let leadTablePromise: Promise<void> | null = null

export async function ensureAdminTables() {
  await ensureLeadTable()
  const sql = getSql()
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web'`
  await sql`CREATE TABLE IF NOT EXISTS lead_audit_log (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, field TEXT NOT NULL, old_value TEXT, new_value TEXT, changed_by_name TEXT NOT NULL, changed_by_email TEXT NOT NULL, changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  await sql`CREATE INDEX IF NOT EXISTS lead_audit_log_lead_id_idx ON lead_audit_log (lead_id)`
  await sql`CREATE TABLE IF NOT EXISTS lead_followups (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, note TEXT, follow_up_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', created_by_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ)`
  await sql`CREATE INDEX IF NOT EXISTS lead_followups_due_idx ON lead_followups (follow_up_at) WHERE status = 'PENDING'`
  await sql`CREATE TABLE IF NOT EXISTS lead_payments (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL, paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), method TEXT, note TEXT, recorded_by_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  await sql`CREATE TABLE IF NOT EXISTS lead_project_stages (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, stage TEXT NOT NULL, note TEXT, stage_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), recorded_by_name TEXT NOT NULL)`
}

export function getSql() {
  if (sqlClient) return sqlClient
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured')
  sqlClient = neon(databaseUrl)
  return sqlClient
}

export async function ensureLeadTable() {
  if (leadTablePromise) return leadTablePromise

  leadTablePromise = (async () => {
    const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
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
      privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
      privacy_consent_at TIMESTAMPTZ,
      terms_version TEXT,
      calculated_at TIMESTAMPTZ,
      feasibility_checked_at TIMESTAMPTZ,
      documents_completed_at TIMESTAMPTZ,
      site_visit_booked_at TIMESTAMPTZ,
      converted_at TIMESTAMPTZ,
      source TEXT NOT NULL DEFAULT 'web'
    )
  `

  await sql`
    ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS kseb_allowed_capacity_kw NUMERIC,
      ADD COLUMN IF NOT EXISTS kseb_feasibility_issued_kw NUMERIC,
      ADD COLUMN IF NOT EXISTS kseb_grid_connected_kw NUMERIC,
      ADD COLUMN IF NOT EXISTS kseb_checked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'NEW',
      ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS terms_version TEXT,
      ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS feasibility_checked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS documents_completed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS site_visit_booked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ
  `

  await sql`
    CREATE TABLE IF NOT EXISTS lead_documents (
      lead_id TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      file_data BYTEA NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (lead_id, document_type)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS site_visits (
      lead_id TEXT PRIMARY KEY REFERENCES leads(lead_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      preferred_date DATE NOT NULL,
      preferred_time TIME NOT NULL,
      location TEXT NOT NULL,
      district TEXT,
      locality TEXT,
      area TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'BOOKED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    ALTER TABLE site_visits
      ADD COLUMN IF NOT EXISTS district TEXT,
      ADD COLUMN IF NOT EXISTS locality TEXT,
      ADD COLUMN IF NOT EXISTS area TEXT,
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
  `

  await sql`
    DELETE FROM site_visits a USING site_visits b
    WHERE a.ctid < b.ctid
      AND a.phone = b.phone
      AND a.preferred_date = b.preferred_date
      AND a.preferred_time = b.preferred_time
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS site_visits_slot_unique
    ON site_visits (phone, preferred_date, preferred_time)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS lead_events (
      event_key TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS notification_events (
      event_key TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (event_key, channel)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      lead_id TEXT,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (lead_status)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS leads_updated_idx ON leads (updated_at DESC)
  `

  await sql`
    CREATE INDEX IF NOT EXISTS lead_events_lead_idx ON lead_events (lead_id, created_at DESC)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      rate_key TEXT NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (rate_key, window_start)
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx
    ON api_rate_limits (window_start)
  `
  })()

  try {
    await leadTablePromise
  } catch (error) {
    leadTablePromise = null
    throw error
  }
}
