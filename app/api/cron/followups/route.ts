import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { sendWhatsAppFollowupReminder } from '@/lib/notifications/whatsapp'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await ensureLeadTable()
  const sql = getSql()
  const rows = await sql.query(
    `SELECT f.id,f.lead_id,f.note,f.follow_up_at,l.name,l.phone
     FROM lead_followups f
     JOIN leads l ON l.lead_id=f.lead_id
     WHERE f.status='PENDING'
       AND f.reminder_sent_at IS NULL
       AND f.follow_up_at <= NOW()
       AND (f.reminder_processing_at IS NULL OR f.reminder_processing_at < NOW() - INTERVAL '10 minutes')
     ORDER BY f.follow_up_at ASC
     LIMIT 100`,
  ) as Record<string, any>[]

  const results = []
  for (const row of rows) {
    const claimed = await sql.query(
      `UPDATE lead_followups
       SET reminder_processing_at=NOW()
       WHERE id=$1
         AND status='PENDING'
         AND reminder_sent_at IS NULL
         AND (reminder_processing_at IS NULL OR reminder_processing_at < NOW() - INTERVAL '10 minutes')
       RETURNING id`,
      [Number(row.id)],
    ) as Record<string, any>[]
    if (!claimed.length) continue

    try {
      const sent = await sendWhatsAppFollowupReminder(row)
      results.push({ id: row.id, sent: sent.sent, configured: sent.configured })
      if (sent.sent) {
        await sql.query(
          "UPDATE lead_followups SET reminder_sent_at=NOW(), reminder_processing_at=NULL, status='REMINDER_SENT' WHERE id=$1 AND status='PENDING' AND reminder_sent_at IS NULL",
          [Number(row.id)],
        )
      } else {
        await sql.query(
          "UPDATE lead_followups SET reminder_processing_at=NULL WHERE id=$1 AND status='PENDING' AND reminder_sent_at IS NULL",
          [Number(row.id)],
        )
      }
    } catch (error) {
      await sql.query(
        "UPDATE lead_followups SET reminder_processing_at=NULL WHERE id=$1 AND status='PENDING' AND reminder_sent_at IS NULL",
        [Number(row.id)],
      )
      results.push({ id: row.id, sent: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return NextResponse.json({ success: true, checked: rows.length, processed: results.length, results })
}
