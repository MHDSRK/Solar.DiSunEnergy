import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { ensureLeadTable, getSql } from '@/lib/db'
import { notifyLeadEvent, notifySiteVisit } from '@/lib/notifications/leadNotifications'

const allowedEvents = new Set(['created', 'calculator', 'feasibility', 'documents', 'site_visit'])

export async function POST(request: Request) {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const body = await request.json()
    const leadId = String(body.leadId ?? '').trim()
    const event = String(body.event ?? '').trim()
    if (!leadId || !allowedEvents.has(event)) return NextResponse.json({ success: false, message: 'Lead ID and a valid notification event are required.' }, { status: 400 })

    await getSql().query(
      "UPDATE notification_events SET status = 'FAILED', updated_at = NOW() WHERE event_key = $1 AND status <> 'SENT'",
      [`${leadId}:${event.toUpperCase()}`],
    )

    const rows = await getSql()`SELECT * FROM leads WHERE lead_id = ${leadId} LIMIT 1`
    const lead = (rows as unknown as Record<string, unknown>[])[0]
    if (!lead) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    const result = event === 'site_visit' ? await notifySiteVisit(lead) : await notifyLeadEvent(event, lead)
    await getSql().query(
      "INSERT INTO admin_audit_logs (action, lead_id, details) VALUES ('NOTIFICATION_RETRY', $1, $2::jsonb)",
      [leadId, JSON.stringify({ event })],
    )
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    if (!unauthorized) console.error('Notification retry failed', error)
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to retry notification.' }, { status: unauthorized ? 401 : 500 })
  }
}
