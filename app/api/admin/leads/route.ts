import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const sql = getSql()
    const [leadRows, documentRows, siteVisitRows] = await sql.transaction([
      sql`SELECT * FROM leads ORDER BY created_at DESC`,
      sql`SELECT lead_id, document_type, file_name, mime_type, size_bytes, uploaded_at FROM lead_documents ORDER BY uploaded_at DESC`,
      sql`SELECT lead_id, name, phone, preferred_date, preferred_time, location, status, created_at, updated_at FROM site_visits ORDER BY created_at DESC`,
    ])
    const documentsByLead = new Map<string, any[]>()
    for (const document of documentRows) {
      const list = documentsByLead.get(String(document.lead_id)) ?? []
      list.push(document)
      documentsByLead.set(String(document.lead_id), list)
    }
    const siteVisitsByLead = new Map<string, any>()
    for (const visit of siteVisitRows) siteVisitsByLead.set(String(visit.lead_id), visit)

    const leads = leadRows.map((lead: any) => ({
      ...lead,
      documents: documentsByLead.get(String(lead.lead_id)) ?? [],
      site_visit: siteVisitsByLead.get(String(lead.lead_id)) ?? null,
    }))
    const stats = {
      total: leads.length,
      contact: leads.filter((x: any) => x.name || x.phone).length,
      calculated: leads.filter((x: any) => x.recommended_kw !== null).length,
      feasibility: leads.filter((x: any) => x.feasibility_status !== null).length,
    }
    return NextResponse.json({ success: true, leads, stats })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    if (!unauthorized) console.error('Admin leads load failed', error)
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to load leads.' }, { status: unauthorized ? 401 : 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const body = await request.json().catch(() => ({}))
    if (body.all === true) {
      if (body.confirmation !== 'DELETE ALL') return NextResponse.json({ success: false, message: 'Type DELETE ALL to confirm.' }, { status: 400 })
      await getSql()`DELETE FROM leads`
      return NextResponse.json({ success: true })
    }
    const ids = Array.isArray(body.leadIds) ? body.leadIds.map(String).filter(Boolean) : []
    if (!ids.length) return NextResponse.json({ success: false, message: 'No leads selected.' }, { status: 400 })
    await getSql().query(
      `DELETE FROM leads WHERE lead_id = ANY($1::text[])`,
      [ids],
    )
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    if (!unauthorized) console.error('Admin leads delete failed', error)
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to delete leads.' }, { status: unauthorized ? 401 : 500 })
  }
}
