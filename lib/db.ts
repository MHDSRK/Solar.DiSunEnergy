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
  await getSql()`
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
}
