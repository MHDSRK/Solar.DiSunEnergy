import { NextResponse } from 'next/server'
import { getSql, ensureLeadTable } from '@/lib/db'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await ensureLeadTable()
  const sql = getSql()
  const due = await sql.query('SELECT id, lead_id, note, follow_up_at FROM lead_followups WHERE status = \'PENDING\' AND follow_up_at <= NOW() ORDER BY follow_up_at ASC LIMIT 200', [])
  let claimed = 0
  for (const item of due as any[]) {
    const eventKey = `followup:${item.id}:${new Date(item.follow_up_at).toISOString().slice(0, 16)}`
    const result = await sql.query("INSERT INTO notification_events (event_key, channel, status, attempts, updated_at) VALUES ($1, 'ADMIN_IN_APP', 'SENT', 1, NOW()) ON CONFLICT (event_key, channel) DO NOTHING RETURNING event_key", [eventKey])
    if (Array.isArray(result) && result.length > 0) claimed += 1
  }
  return NextResponse.json({ due: (due as any[]).length, claimed, reminders: due })
}
