import { NextResponse } from 'next/server'
import { getSql, ensureLeadTable } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await ensureLeadTable()
  const url = new URL(request.url)
  const from = url.searchParams.get('from') || '1970-01-01'
  const to = url.searchParams.get('to') || '2999-12-31'
  const sql = getSql()
  const [funnel, payments, stages] = await Promise.all([
    sql.query('SELECT COALESCE(lead_status, \'NEW\') AS status, COALESCE(source, \'web\') AS source, COUNT(*)::int AS count FROM leads WHERE created_at >= $1 AND created_at < ($2::date + INTERVAL \'1 day\') GROUP BY 1, 2 ORDER BY 1, 2', [from, to]),
    sql.query('SELECT COALESCE(recorded_by_name, \'Unknown\') AS recorded_by_name, COALESCE(SUM(amount), 0)::numeric AS collected, COUNT(*)::int AS entries FROM lead_payments WHERE paid_at >= $1 AND paid_at < ($2::date + INTERVAL \'1 day\') GROUP BY 1 ORDER BY 1', [from, to]),
    sql.query('SELECT stage, COUNT(DISTINCT lead_id)::int AS leads, MIN(stage_at) AS first_recorded, MAX(stage_at) AS last_recorded FROM lead_project_stages GROUP BY stage ORDER BY MIN(stage_at) NULLS LAST', []),
  ])
  return NextResponse.json({ from, to, funnel, payments, stages })
}
