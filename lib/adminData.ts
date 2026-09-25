import { ensureAdminTables, getSql } from '@/lib/db'

export { getSql } from '@/lib/db'
import type { AdminIdentity } from '@/lib/adminAuth'

export async function auditLeadChanges(leadId: string, before: Record<string, unknown> | null, after: Record<string, unknown>, admin: AdminIdentity) {
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after)])
  const rows = [...fields].filter((field) => !['updated_at', 'created_at'].includes(field) && String(before?.[field] ?? '') !== String(after[field] ?? ''))
  for (const field of rows) {
    await getSql()`INSERT INTO lead_audit_log (lead_id, field, old_value, new_value, changed_by_name, changed_by_email) VALUES (${leadId}, ${field}, ${before?.[field] == null ? null : String(before[field])}, ${after[field] == null ? null : String(after[field])}, ${admin.name}, ${admin.email})`
  }
}

export { ensureAdminTables }
