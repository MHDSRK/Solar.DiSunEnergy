import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { ensureAdminTables, getSql } from '@/lib/adminData'
import { auditLeadChanges } from '@/lib/adminData'

const makeLeadId = () => `DSN-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
const fields = ['name','phone','district','area','bill','monthly_kwh','connection_category','recommended_kw','setup_cost','subsidy','financing_amount','customer_contribution','kseb_consumer_number','kseb_district','kseb_section','transformer']
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(); await ensureAdminTables(); const body = await request.json(); const leadId = makeLeadId()
    const data: Record<string, unknown> = {}; for (const field of fields) if (body[field] !== undefined) data[field] = body[field]
    const columns = ['lead_id','source',...Object.keys(data)]; const values = [leadId,'manual',...Object.values(data)]
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
    await getSql().query(`INSERT INTO leads (${columns.join(',')}) VALUES (${placeholders})`, values)
    await auditLeadChanges(leadId, null, { ...data, source: 'manual' }, admin)
    return NextResponse.json({ success: true, leadId })
  } catch (error) { const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'; return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to create lead.' }, { status: unauthorized ? 401 : 400 }) }
}
