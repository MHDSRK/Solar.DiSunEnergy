import { getSql, ensureLeadTable } from '@/lib/db'
import type { AdminIdentity } from '@/lib/adminAuth'
export async function ensureAuditReady(){ await ensureLeadTable() }
export async function auditDiff(leadId:string, oldRow:Record<string,unknown>|null, newRow:Record<string,unknown>, actor:AdminIdentity, fields:string[]){
  const rows=fields.filter(f=>String(oldRow?.[f]??'')!==String(newRow?.[f]??''))
  for(const field of rows){
    await getSql()`INSERT INTO lead_audit_log (lead_id,field,old_value,new_value,changed_by_name,changed_by_email) VALUES (${leadId},${field},${oldRow?.[field] == null ? null : String(oldRow[field])},${newRow[field] == null ? null : String(newRow[field])},${actor.name},${actor.email})`
  }
}
export async function auditEvent(leadId:string, field:string, newValue:string, actor:AdminIdentity){
  await getSql()`INSERT INTO lead_audit_log (lead_id,field,old_value,new_value,changed_by_name,changed_by_email) VALUES (${leadId},${field},NULL,${newValue},${actor.name},${actor.email})`
}
