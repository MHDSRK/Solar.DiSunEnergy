import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { ensureLeadTable, getSql } from '@/lib/db'
import { notifyLeadEvent, notifySiteVisit } from '@/lib/notifications/leadNotifications'
import { auditEvent } from '@/lib/adminAudit'

const allowedEvents = new Set(['created', 'calculator', 'feasibility', 'documents', 'site_visit'])

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin()
    await ensureLeadTable()
    const body = await request.json()
    const leadId = String(body.leadId ?? '').trim()
    const event = String(body.event ?? '').trim()
    if (!leadId || !allowedEvents.has(event)) return NextResponse.json({ success: false, message: 'Lead ID and a valid notification event are required.' }, { status: 400 })

    const rows = await getSql().query(
      "SELECT status FROM notification_events WHERE event_key = $1 AND channel = $2 LIMIT 1",
      [`${leadId}:${event.toUpperCase()}`, event === 'calculator' ? 'WHATSAPP' : 'GOOGLE_SHEETS'],
    ) as Record<string, any>[]
    if (!rows.length) return NextResponse.json({ success: false, message: 'No notification attempt exists for this event.' }, { status: 404 })
    if (rows[0].status !== 'FAILED') {
      return NextResponse.json({ success: false, message: 'Only failed notifications can be retried.' }, { status: 409 })
    }

    const leadRows = await getSql()`SELECT * FROM leads WHERE lead_id = ${leadId} LIMIT 1`
    const lead = (leadRows as unknown as Record<string, unknown>[])[0]
    if (!lead) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    const result = event === 'site_visit' ? await notifySiteVisit(lead) : await notifyLeadEvent(event, lead)
    await getSql().query(
      "INSERT INTO admin_audit_logs (action, lead_id, details) VALUES ('NOTIFICATION_RETRY', $1, $2::jsonb)",
      [leadId, JSON.stringify({ event, changedBy: actor.email })],
    )
    await auditEvent(leadId, 'notification_retry', event + ' by ' + actor.name, actor)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    if (!unauthorized) console.error('Notification retry failed', error)
    return NextResponse.json({ success: false, message: unauthorized ? 'Unauthorized' : 'Unable to retry notification.' }, { status: unauthorized ? 401 : 500 })
  }
}
