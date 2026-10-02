import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const id = Number(new URL(request.url).searchParams.get('conversationId') || 0)
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, message: 'Conversation ID is required.' }, { status: 400 })

    const rows = await getSql().query(
      `SELECT
         m.id, m.whatsapp_message_id, m.direction, m.message_type, m.body, m.caption,
         m.delivery_status, m.sent_at, m.delivered_at, m.read_at, m.failed_at, m.error_payload,
         ct.phone, ct.display_name, ct.profile_name, ct.lead_id
       FROM whatsapp_messages m
       JOIN whatsapp_conversations c ON c.id = m.conversation_id
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       WHERE c.id = $1
       ORDER BY m.created_at ASC`,
      [id],
    ) as Record<string, any>[]

    await getSql().query('UPDATE whatsapp_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1', [id])
    return NextResponse.json({ success: true, messages: rows })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    console.error('WhatsApp conversation lookup failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load WhatsApp conversation.' }, { status: 500 })
  }
}
