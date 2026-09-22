import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null

export function getSql() {
  if (sqlClient) return sqlClient
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured')
  sqlClient = neon(databaseUrl)
  return sqlClient
}

export async function ensureLeadTable() {
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
      remaining_transformer_capacity NUMERIC
    )
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
      status TEXT NOT NULL DEFAULT 'BOOKED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
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
}
