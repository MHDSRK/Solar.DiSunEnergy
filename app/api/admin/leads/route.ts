import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const sql = getSql()

    const leadRows = (await sql`
      SELECT lead_id, created_at, updated_at, lead_status, name, phone, email, district, area, monthly_kwh, connection_category, recommended_kw, setup_cost, subsidy, financing_amount, customer_contribution, kseb_consumer_number, kseb_district, kseb_section, transformer, feasibility_status, requested_kw, remaining_transformer_capacity, privacy_consent, site_visit_booked_at
      FROM leads ORDER BY created_at DESC
    `) as unknown as Record<string, any>[]

    const documentRows = (await sql`
      SELECT lead_id, document_type, file_name, mime_type, size_bytes, uploaded_at
      FROM lead_documents ORDER BY uploaded_at DESC
    `) as unknown as Record<string, any>[]

    const siteVisitRows = (await sql`
      SELECT lead_id, name, phone, preferred_date, preferred_time, location, district, locality, area, latitude, longitude, status, created_at, updated_at
      FROM site_visits ORDER BY created_at DESC
    `) as unknown as Record<string, any>[]

    let notificationRows: Record<string, any>[] = []
    let notificationQueryError = ''
    try {
      notificationRows = (await sql`
        SELECT event_key, channel, status, attempts, last_error, updated_at
        FROM notification_events ORDER BY updated_at DESC
      `) as unknown as Record<string, any>[]
    } catch (error) {
      notificationQueryError = error instanceof Error ? error.message : String(error)
      console.error('Admin notification log load failed', error)
    }

    const documentsByLead = new Map<string, any[]>()
    for (const document of documentRows) {
      const list = documentsByLead.get(String(document.lead_id)) ?? []
      list.push(document)
      documentsByLead.set(String(document.lead_id), list)
    }

    const siteVisitsByLead = new Map<string, any>()
    for (const visit of siteVisitRows) siteVisitsByLead.set(String(visit.lead_id), visit)

    const notificationsByLead = new Map<string, any[]>()
    for (const notification of notificationRows) {
      const leadId = String(notification.event_key).split(':')[0]
      const list = notificationsByLead.get(leadId) ?? []
      list.push(notification)
      notificationsByLead.set(leadId, list)
    }

    const leads = leadRows.map((lead: any) => ({
      ...lead,
      documents: documentsByLead.get(String(lead.lead_id)) ?? [],
      site_visit: siteVisitsByLead.get(String(lead.lead_id)) ?? null,
      notifications: notificationsByLead.get(String(lead.lead_id)) ?? [],
    }))

    const stats = {
      total: leads.length,
      contact: leads.filter((x: any) => x.name || x.phone).length,
      calculated: leads.filter((x: any) => x.recommended_kw !== null).length,
      feasibility: leads.filter((x: any) => x.feasibility_status !== null).length,
    }

    return NextResponse.json({
      success: true,
      leads,
      stats,
      diagnostics: {
        database: 'ok',
        leadsCount: leads.length,
        notificationLog: notificationQueryError ? 'error' : 'ok',
        notificationQueryError: notificationQueryError || null,
      },
    })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    if (!unauthorized) console.error('Admin leads load failed', error)
    return NextResponse.json({
      success: false,
      message: unauthorized ? 'Unauthorized' : error instanceof Error ? error.message : 'Unable to load leads.',
    }, { status: unauthorized ? 401 : 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const body = await request.json().catch(() => ({}))
    const sql = getSql()

    if (body.all === true) {
      if (body.confirmation !== 'DELETE ALL') return NextResponse.json({ success: false, message: 'Type DELETE ALL to confirm.' }, { status: 400 })
      await sql.transaction([
        sql`DELETE FROM leads`,
        sql`INSERT INTO admin_audit_logs (action, details) VALUES ('LEADS_BULK_DELETE', ${JSON.stringify({ all: true })}::jsonb)`,
      ])
      return NextResponse.json({ success: true })
    }

    const ids = Array.isArray(body.leadIds) ? body.leadIds.map(String).filter(Boolean) : []
    if (!ids.length) return NextResponse.json({ success: false, message: 'No leads selected.' }, { status: 400 })

    const idArray = ids
    await sql.transaction([
      sql`DELETE FROM leads WHERE lead_id = ANY(${idArray}::text[])`,
      sql`INSERT INTO admin_audit_logs (action, details) VALUES ('LEADS_BULK_DELETE', ${JSON.stringify({ leadIds: ids })}::jsonb)`,
    ])
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    if (!unauthorized) console.error('Admin leads delete failed', error)
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to delete leads.' }, { status: unauthorized ? 401 : 500 })
  }
}
