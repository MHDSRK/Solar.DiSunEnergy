import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const params = new URL(request.url).searchParams
    const id = Number(params.get('conversationId') || 0)
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || '50') || 50))
    const before = params.get('before')?.trim() || null
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, message: 'Conversation ID is required.' }, { status: 400 })

    const rows = await getSql().query(
      `SELECT id, whatsapp_message_id, direction, message_type, body, caption, delivery_status, sent_at, delivered_at, read_at, failed_at, error_payload, created_at,
              (SELECT phone FROM whatsapp_contacts ct JOIN whatsapp_conversations cc ON cc.contact_id = ct.id WHERE cc.id = $1 LIMIT 1) AS phone,
              (SELECT display_name FROM whatsapp_contacts ct JOIN whatsapp_conversations cc ON cc.contact_id = ct.id WHERE cc.id = $1 LIMIT 1) AS display_name,
              (SELECT profile_name FROM whatsapp_contacts ct JOIN whatsapp_conversations cc ON cc.contact_id = ct.id WHERE cc.id = $1 LIMIT 1) AS profile_name,
              (SELECT lead_id FROM whatsapp_contacts ct JOIN whatsapp_conversations cc ON cc.contact_id = ct.id WHERE cc.id = $1 LIMIT 1) AS lead_id
       FROM (
         SELECT *
         FROM whatsapp_messages
         WHERE conversation_id = $1
           AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)
         ORDER BY created_at DESC
         LIMIT $3
       ) m
       ORDER BY created_at ASC`,
      [id, before, limit],
    ) as Record<string, any>[]

    const oldest = rows[0]?.created_at || null
    const olderRows = oldest
      ? await getSql().query('SELECT 1 FROM whatsapp_messages WHERE conversation_id = $1 AND created_at < $2 LIMIT 1', [id, oldest]) as Record<string, any>[]
      : []
    const hasMore = olderRows.length > 0

    if (!before) {
      await getSql().query('UPDATE whatsapp_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1', [id])
    }
    return NextResponse.json({ success: true, messages: rows, hasMore, nextBefore: hasMore ? oldest : null })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    console.error('WhatsApp conversation lookup failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load WhatsApp conversation.' }, { status: 500 })
  }
}
