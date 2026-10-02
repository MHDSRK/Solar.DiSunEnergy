import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const messageId = String(new URL(request.url).searchParams.get('messageId') || '').trim()
    if (!messageId) {
      return NextResponse.json({ success: false, message: 'Message ID is required.' }, { status: 400 })
    }

    const rows = await getSql().query(
      `SELECT whatsapp_message_id, delivery_status, sent_at, delivered_at, read_at, failed_at, error_payload, updated_at
       FROM whatsapp_messages
       WHERE whatsapp_message_id = $1
       LIMIT 1`,
      [messageId],
    ) as Record<string, any>[]

    const row = rows[0]
    if (!row) return NextResponse.json({ success: false, message: 'WhatsApp message not found.' }, { status: 404 })

    return NextResponse.json({
      success: true,
      messageId: row.whatsapp_message_id,
      status: row.delivery_status || 'accepted',
      sentAt: row.sent_at || null,
      deliveredAt: row.delivered_at || null,
      readAt: row.read_at || null,
      failedAt: row.failed_at || null,
      error: row.error_payload || null,
      updatedAt: row.updated_at || null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    console.error('WhatsApp status lookup failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load WhatsApp message status.' }, { status: 500 })
  }
}
