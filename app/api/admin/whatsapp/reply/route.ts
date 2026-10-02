import { NextResponse } from 'next/server'
import { getSql, ensureLeadTable } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { sendWhatsAppTextMessage as sendText } from '@/lib/notifications/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    await ensureLeadTable()
    const body = await request.json()
    const conversationId = Number(body?.conversationId || 0)
    const message = String(body?.message || '').trim()
    if (!Number.isInteger(conversationId) || conversationId <= 0) return NextResponse.json({ success: false, message: 'Conversation ID is required.' }, { status: 400 })
    if (!message) return NextResponse.json({ success: false, message: 'Message is required.' }, { status: 400 })

    const rows = await getSql().query(
      `SELECT c.id AS conversation_id, ct.phone, ct.lead_id
       FROM whatsapp_conversations c
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE c.id = $1 LIMIT 1`,
      [conversationId],
    ) as Record<string, any>[]
    const contact = rows[0]
    if (!contact) return NextResponse.json({ success: false, message: 'Conversation not found.' }, { status: 404 })

    const lead = contact.lead_id
      ? (await getSql().query('SELECT lead_id, phone FROM leads WHERE lead_id = $1 LIMIT 1', [contact.lead_id]) as Record<string, any>[])[0]
      : { lead_id: null, phone: contact.phone }
    if (!lead?.phone) return NextResponse.json({ success: false, message: 'This WhatsApp contact is not linked to a lead with a phone number.' }, { status: 400 })

    const result = await sendText(lead, message)
    if (!result.sent) return NextResponse.json({ success: false, message: 'WhatsApp integration is not configured.' }, { status: 503 })
    return NextResponse.json({ success: true, messageId: result.messageId, recipient: result.recipient })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    console.error('WhatsApp reply failed', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unable to send WhatsApp reply.' }, { status: 500 })
  }
}
