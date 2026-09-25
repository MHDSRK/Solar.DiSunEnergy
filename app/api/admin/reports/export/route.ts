import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'

const columns = ['Updated At','Lead ID','Name','Phone','District','Area','Bill (₹)','Monthly KWH','Category','Recommended KW','Setup Cost','Subsidy','Financing Amount','Customer Contribution','KSEB Consumer Number','Status','Source']
const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
export async function GET(request: Request) {
  try {
    await requireAdmin()
    const url = new URL(request.url)
    const from = url.searchParams.get('from') || '1970-01-01'
    const to = url.searchParams.get('to') || '2999-12-31'
    const sql = getSql()
    const rows = await sql`SELECT updated_at, lead_id, name, phone, district, area, bill, monthly_kwh, category, recommended_kw, setup_cost, subsidy, financing_amount, customer_contribution, kseb_consumer_number, lead_status, source FROM leads WHERE created_at >= ${from}::date AND created_at < (${to}::date + INTERVAL '1 day') ORDER BY created_at DESC`
    const body = [columns, ...(rows as any[]).map(row => [row.updated_at,row.lead_id,row.name,row.phone,row.district,row.area,row.bill,row.monthly_kwh,row.category,row.recommended_kw,row.setup_cost,row.subsidy,row.financing_amount,row.customer_contribution,row.kseb_consumer_number,row.lead_status,row.source].map(escape))].map(row => row.join(',')).join('\r\n')
    return new NextResponse(body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="disun-leads.csv"' } })
  } catch { return NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
}
