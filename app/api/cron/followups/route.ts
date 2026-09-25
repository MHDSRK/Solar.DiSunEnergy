import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { sendWhatsAppFollowupReminder } from '@/lib/notifications/whatsapp'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }
  await ensureLeadTable()
  const rows = await getSql().query(
    `SELECT f.id,f.lead_id,f.note,f.follow_up_at,l.name,l.phone
     FROM lead_followups f JOIN leads l ON l.lead_id=f.lead_id
     WHERE f.status='PENDING' AND f.follow_up_at <= NOW()
     ORDER BY f.follow_up_at ASC LIMIT 100`,
  ) as unknown as Record<string, any>[]
  const results = []
  for (const row of rows) {
    try {
      const sent = await sendWhatsAppFollowupReminder(row)
      results.push({ id: row.id, sent: sent.sent, configured: sent.configured })
      if (sent.sent) {
        await getSql().query("UPDATE lead_followups SET status='REMINDER_SENT' WHERE id=$1 AND status='PENDING'", [Number(row.id)])
      }
    } catch (error) {
      results.push({ id: row.id, sent: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return NextResponse.json({ success: true, checked: rows.length, results })
}
