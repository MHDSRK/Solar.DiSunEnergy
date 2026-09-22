import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'

function makeLeadId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `DSN-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

export async function POST() {
  try {
    await ensureLeadTable()
    const leadId = makeLeadId()
    await getSql()`INSERT INTO leads (lead_id) VALUES (${leadId})`
    return NextResponse.json({ success: true, leadId })
  } catch (error) {
    console.error('Lead creation failed', error)
    return NextResponse.json({ success: false, message: 'Unable to create lead.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureLeadTable()
    const body = await request.json()
    const leadId = String(body.leadId ?? '').trim()
    if (!leadId) return NextResponse.json({ success: false, message: 'Lead ID is required.' }, { status: 400 })
    const fields: Record<string, unknown> = { ...body }
    delete fields.leadId
    const allowed = ['name','phone','district','area','bill','monthly_kwh','connection_category','recommended_kw','setup_cost','subsidy','financing_amount','customer_contribution','kseb_consumer_number','kseb_district','kseb_section','transformer','feasibility_status','requested_kw','remaining_transformer_capacity']
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key))
    if (!entries.length) return NextResponse.json({ success: true })
    for (const [key, value] of entries) {
      if (!/^[a-z_]+$/.test(key)) continue
      await getSql().query(`UPDATE leads SET ${key} = $1, updated_at = NOW() WHERE lead_id = $2`, [value ?? null, leadId])
    }
    return NextResponse.json({ success: true, leadId })
  } catch (error) {
    console.error('Lead update failed', error)
    return NextResponse.json({ success: false, message: 'Unable to update lead.' }, { status: 500 })
  }
}
