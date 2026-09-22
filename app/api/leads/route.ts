import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { createLeadToken, verifyLeadToken } from '@/lib/leadAuth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { notifyLeadEvent } from '@/lib/notifications/leadNotifications'

function makeLeadId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `DSN-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

async function getLead(leadId: string) {
  const rows = await getSql()`SELECT * FROM leads WHERE lead_id = ${leadId} LIMIT 1`
  return (rows as unknown as Record<string, unknown>[])[0] ?? null
}

export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'lead-create', 20, 60)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)

    await ensureLeadTable()
    const leadId = makeLeadId()
    await getSql()`INSERT INTO leads (lead_id) VALUES (${leadId})`

    const lead = await getLead(leadId)
    if (lead) {
      void notifyLeadEvent('created', lead).catch((error) => console.error('Lead creation notifications failed', error))
    }

    return NextResponse.json({ success: true, leadId, leadToken: createLeadToken(leadId) })
  } catch (error) {
    console.error('Lead creation failed', error)
    return NextResponse.json({ success: false, message: 'Unable to create lead.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'lead-update', 60, 60)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)

    const body = await request.json()
    const leadId = String(body.leadId ?? '').trim()
    const leadToken = String(body.leadToken ?? '').trim()
    if (!leadId || !leadToken) return NextResponse.json({ success: false, message: 'Lead authorization is required.' }, { status: 401 })
    if (!verifyLeadToken(leadId, leadToken)) return NextResponse.json({ success: false, message: 'Invalid or expired lead authorization.' }, { status: 401 })

    const fields: Record<string, unknown> = { ...body }
    delete fields.leadId
    delete fields.leadToken

    const allowed = [
      'name','phone','district','area','bill','monthly_kwh','connection_category',
      'recommended_kw','setup_cost','subsidy','financing_amount','customer_contribution',
      'kseb_consumer_number','kseb_district','kseb_section','transformer',
      'feasibility_status','requested_kw','remaining_transformer_capacity',
    ]
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key))
    if (!entries.length) return NextResponse.json({ success: true, leadId })

    const setParts: string[] = []
    const values: unknown[] = []
    for (const [key, value] of entries) {
      if (!/^[a-z_]+$/.test(key)) continue
      setParts.push(`${key} = $${values.length + 1}`)
      values.push(value ?? null)
    }
    if (!setParts.length) return NextResponse.json({ success: true, leadId })

    values.push(leadId)
    const result = await getSql().query(
      `UPDATE leads SET ${setParts.join(', ')}, updated_at = NOW() WHERE lead_id = $${values.length} RETURNING lead_id`,
      values,
    )
    const updatedRows = result as unknown as Record<string, any>[]
    if (!updatedRows.length) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    const lead = await getLead(leadId)
    if (lead) {
      const event = entries.some(([key]) => key.startsWith('kseb_') || key === 'transformer' || key === 'feasibility_status' || key === 'requested_kw' || key === 'remaining_transformer_capacity')
        ? 'feasibility'
        : 'calculator'
      void notifyLeadEvent(event, lead).catch((error) => console.error(`Lead ${event} notifications failed`, error))
    }

    return NextResponse.json({ success: true, leadId })
  } catch (error) {
    console.error('Lead update failed', error)
    return NextResponse.json({ success: false, message: 'Unable to update lead.' }, { status: 500 })
  }
}
