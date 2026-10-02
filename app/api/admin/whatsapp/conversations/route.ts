import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const rows = await getSql().query(
      `SELECT
         c.id AS conversation_id,
         c.status,
         c.unread_count,
         c.last_message_at,
         ct.phone,
         ct.display_name,
         ct.profile_name,
         ct.lead_id,
         m.body AS last_body,
         m.message_type AS last_message_type,
         m.direction AS last_direction
       FROM whatsapp_conversations c
       JOIN whatsapp_contacts ct ON ct.id = c.contact_id
       LEFT JOIN LATERAL (
         SELECT body, message_type, direction
         FROM whatsapp_messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC`,
    ) as Record<string, any>[]
    return NextResponse.json({ success: true, conversations: rows })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    console.error('WhatsApp conversations lookup failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load WhatsApp conversations.' }, { status: 500 })
  }
}
