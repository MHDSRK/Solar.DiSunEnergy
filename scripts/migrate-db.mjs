import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not configured')

const sql = neon(databaseUrl)
const migrations = [
  `CREATE TABLE IF NOT EXISTS leads (lead_id TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name TEXT, phone TEXT, district TEXT, area TEXT, bill NUMERIC, monthly_kwh NUMERIC, connection_category TEXT, recommended_kw NUMERIC, setup_cost NUMERIC, subsidy NUMERIC, financing_amount NUMERIC, customer_contribution NUMERIC, kseb_consumer_number TEXT, kseb_district TEXT, kseb_section TEXT, transformer TEXT, feasibility_status TEXT, requested_kw NUMERIC, remaining_transformer_capacity NUMERIC, kseb_allowed_capacity_kw NUMERIC, kseb_feasibility_issued_kw NUMERIC, kseb_grid_connected_kw NUMERIC, kseb_checked_at TIMESTAMPTZ, lead_status TEXT NOT NULL DEFAULT 'NEW', source TEXT NOT NULL DEFAULT 'web', privacy_consent BOOLEAN NOT NULL DEFAULT FALSE, privacy_consent_at TIMESTAMPTZ, terms_version TEXT, calculated_at TIMESTAMPTZ, feasibility_checked_at TIMESTAMPTZ, documents_completed_at TIMESTAMPTZ, site_visit_booked_at TIMESTAMPTZ, converted_at TIMESTAMPTZ)`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS kseb_allowed_capacity_kw NUMERIC, ADD COLUMN IF NOT EXISTS kseb_feasibility_issued_kw NUMERIC, ADD COLUMN IF NOT EXISTS kseb_grid_connected_kw NUMERIC, ADD COLUMN IF NOT EXISTS kseb_checked_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'NEW', ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web', ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS terms_version TEXT, ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS feasibility_checked_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS documents_completed_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS site_visit_booked_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS lead_documents (lead_id TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE, document_type TEXT NOT NULL, file_name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, file_data BYTEA NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (lead_id, document_type))`,
  `CREATE TABLE IF NOT EXISTS site_visits (lead_id TEXT PRIMARY KEY REFERENCES leads(lead_id) ON DELETE CASCADE, name TEXT NOT NULL, phone TEXT NOT NULL, preferred_date DATE NOT NULL, preferred_time TIME NOT NULL, location TEXT NOT NULL, district TEXT, locality TEXT, area TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, status TEXT NOT NULL DEFAULT 'BOOKED', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS district TEXT, ADD COLUMN IF NOT EXISTS locality TEXT, ADD COLUMN IF NOT EXISTS area TEXT, ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION, ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`,
  `CREATE TABLE IF NOT EXISTS lead_events (event_key TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE, event_type TEXT NOT NULL, payload JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS notification_events (event_key TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (event_key, channel))`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs (id BIGSERIAL PRIMARY KEY, action TEXT NOT NULL, lead_id TEXT, details JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS lead_audit_log (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, field TEXT NOT NULL, old_value TEXT, new_value TEXT, changed_by_name TEXT NOT NULL, changed_by_email TEXT NOT NULL, changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS admin_tasks (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, note TEXT, task_date DATE NOT NULL DEFAULT CURRENT_DATE, number TEXT, place TEXT, stage TEXT, plant TEXT, payment TEXT, source TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_by_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS lead_followups (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, note TEXT, follow_up_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', reminder_sent_at TIMESTAMPTZ, created_by_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ)`,
  `ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS lead_payments (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL, paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), method TEXT, note TEXT, recorded_by_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS lead_project_stages (id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, stage TEXT NOT NULL, note TEXT, stage_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), recorded_by_name TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS api_rate_limits (rate_key TEXT NOT NULL, window_start TIMESTAMPTZ NOT NULL, request_count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (rate_key, window_start))`,
  `CREATE INDEX IF NOT EXISTS lead_audit_log_lead_id_idx ON lead_audit_log (lead_id)`,
  `CREATE INDEX IF NOT EXISTS lead_followups_due_reminder_idx ON lead_followups (follow_up_at) WHERE status = 'PENDING' AND reminder_sent_at IS NULL`,
  `DROP INDEX IF EXISTS site_visits_slot_unique`,
  `UPDATE site_visits sv SET status = 'CANCELLED' WHERE status = 'BOOKED' AND EXISTS (SELECT 1 FROM site_visits newer WHERE newer.status = 'BOOKED' AND newer.preferred_date = sv.preferred_date AND newer.preferred_time = sv.preferred_time AND newer.created_at > sv.created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS site_visits_slot_unique ON site_visits (preferred_date, preferred_time) WHERE status = 'BOOKED'`,
  `DELETE FROM lead_audit_log WHERE NOT EXISTS (SELECT 1 FROM leads WHERE leads.lead_id = lead_audit_log.lead_id)`,
  `DELETE FROM lead_followups WHERE NOT EXISTS (SELECT 1 FROM leads WHERE leads.lead_id = lead_followups.lead_id)`,
  `DELETE FROM lead_payments WHERE NOT EXISTS (SELECT 1 FROM leads WHERE leads.lead_id = lead_payments.lead_id)`,
  `DELETE FROM lead_project_stages WHERE NOT EXISTS (SELECT 1 FROM leads WHERE leads.lead_id = lead_project_stages.lead_id)`,
  `ALTER TABLE lead_audit_log ADD CONSTRAINT lead_audit_log_lead_fk FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE`,
  `ALTER TABLE lead_followups ADD CONSTRAINT lead_followups_lead_fk FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE`,
  `ALTER TABLE lead_payments ADD CONSTRAINT lead_payments_lead_fk FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE`,
  `ALTER TABLE lead_project_stages ADD CONSTRAINT lead_project_stages_lead_fk FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (lead_status)`,
  `CREATE INDEX IF NOT EXISTS leads_updated_idx ON leads (updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS lead_events_lead_idx ON lead_events (lead_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx ON api_rate_limits (window_start)`,
  `CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (id BIGSERIAL PRIMARY KEY, event_type TEXT NOT NULL, message_id TEXT, phone_number_id TEXT, payload JSONB NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_message_idx ON whatsapp_webhook_events (message_id, received_at DESC)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_type_idx ON whatsapp_webhook_events (event_type, received_at DESC)`,
  `CREATE TABLE IF NOT EXISTS whatsapp_contacts (id BIGSERIAL PRIMARY KEY, phone TEXT NOT NULL UNIQUE, lead_id TEXT REFERENCES leads(lead_id) ON DELETE SET NULL, display_name TEXT, profile_name TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS whatsapp_conversations (id BIGSERIAL PRIMARY KEY, contact_id BIGINT NOT NULL UNIQUE REFERENCES whatsapp_contacts(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'OPEN', unread_count INTEGER NOT NULL DEFAULT 0, last_message_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS whatsapp_messages (id BIGSERIAL PRIMARY KEY, conversation_id BIGINT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE, whatsapp_message_id TEXT NOT NULL UNIQUE, direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')), message_type TEXT NOT NULL, body TEXT, media_id TEXT, caption TEXT, delivery_status TEXT NOT NULL DEFAULT 'accepted', sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), delivered_at TIMESTAMPTZ, read_at TIMESTAMPTZ, failed_at TIMESTAMPTZ, error_payload JSONB, raw_payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status_at TIMESTAMPTZ)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_idx ON whatsapp_messages (conversation_id, sent_at DESC)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_contacts_lead_idx ON whatsapp_contacts (lead_id)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx ON whatsapp_messages (delivery_status)`,
  `ALTER TABLE whatsapp_messages ALTER COLUMN delivery_status SET DEFAULT 'accepted'`,
  `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS status_at TIMESTAMPTZ`,

]

for (const statement of migrations) {
  try {
    await sql.unsafe(statement)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/already exists|duplicate_object/i.test(message)) throw error
  }
}

const requiredTables = [
  'leads',
  'lead_followups',
  'whatsapp_contacts',
  'whatsapp_conversations',
  'whatsapp_messages',
]

const tableRows = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
`

const existingTables = new Set(tableRows.map((row) => row.table_name))
const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName))

if (missingTables.length > 0) {
  throw new Error(`Database migration incomplete. Missing required tables: ${missingTables.join(', ')}`)
}

const leadFollowupsExists = await sql`
  SELECT to_regclass('public.lead_followups') AS table_name
`

if (leadFollowupsExists[0]?.table_name) {
  await sql`
    UPDATE public.lead_followups
    SET status = 'PENDING',
        reminder_sent_at = COALESCE(reminder_sent_at, NOW())
    WHERE status = 'REMINDER_SENT'
  `
}

console.log(`Database migration verified successfully. Applied ${migrations.length} schema statements and confirmed all required tables.`)
process.exit(0)
