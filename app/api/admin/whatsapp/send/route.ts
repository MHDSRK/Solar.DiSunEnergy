import { NextResponse } from 'next/server'
import { getSql, ensureLeadTable } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { sendWhatsAppLeadTemplate } from '@/lib/notifications/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    await ensureLeadTable()

    const body = await request.json()
    const leadId = String(body?.leadId || '').trim()
    if (!leadId) {
      return NextResponse.json({ success: false, message: 'Lead ID is required.' }, { status: 400 })
    }

    const rows = await getSql().query(
      'SELECT * FROM leads WHERE lead_id = $1 LIMIT 1',
      [leadId],
    ) as Record<string, any>[]

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })
    }

    if (!String(rows[0].phone || '').replace(/\D/g, '')) {
      return NextResponse.json({ success: false, message: 'This lead does not have a phone number.' }, { status: 400 })
    }

    const result = await sendWhatsAppLeadTemplate(rows[0])
    if (!result.sent) {
      return NextResponse.json({
        success: false,
        message: 'WhatsApp integration is not configured.',
        configured: result.configured,
      }, { status: 503 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      recipient: result.recipient,
    })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'UNAUTHORIZED'
    const message = error instanceof Error ? error.message : 'Unable to send WhatsApp message.'
    return NextResponse.json(
      { success: false, message: unauthorized ? 'Unauthorized' : message },
      { status: unauthorized ? 401 : 500 },
    )
  }
}
