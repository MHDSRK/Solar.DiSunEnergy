import { after, NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { createLeadToken, verifyLeadToken } from '@/lib/leadAuth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { notifyLeadEvent } from '@/lib/notifications/leadNotifications'

const TERMS_VERSION = '2026-09-22'

function makeLeadId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `DSN-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

async function getLead(leadId: string) {
  const rows = await getSql()`SELECT * FROM leads WHERE lead_id = ${leadId} LIMIT 1`
  return (rows as unknown as Record<string, unknown>[])[0] ?? null
}

function validPhone(value: unknown) {
  return /^[6-9]\d{9}$/.test(String(value ?? ''))
}

export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'lead-create', 20, 60)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)

    await ensureLeadTable()
    const leadId = makeLeadId()
    const leadToken = createLeadToken(leadId)

    await getSql()`INSERT INTO leads (lead_id) VALUES (${leadId})`

    const lead = await getLead(leadId)
    if (lead) {\n      after(async () => {\n        try {\n          await notifyLeadEvent('created', lead)\n        } catch (error) {\n          console.error('Lead creation notifications failed', error)\n        }\n      })\n    }

    return NextResponse.json(
      { success: true, leadId, leadToken },
      { headers: { 'Cache-Control': 'no-store' } },
    )
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

    const existing = await getLead(leadId)
    if (!existing) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    const fields: Record<string, unknown> = { ...body }
    delete fields.leadId
    delete fields.leadToken

    const allowed = [
      'name','phone','district','area','bill','monthly_kwh','connection_category',
      'recommended_kw','setup_cost','subsidy','financing_amount','customer_contribution',
      'kseb_consumer_number','kseb_district','kseb_section','transformer',
      'feasibility_status','requested_kw','remaining_transformer_capacity','kseb_allowed_capacity_kw','kseb_feasibility_issued_kw','kseb_grid_connected_kw','kseb_checked_at',
    ]
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key))
    if (!entries.length) return NextResponse.json({ success: true, leadId })

    const calculatorFields = new Set(['name','phone','district','area','bill','monthly_kwh','connection_category','recommended_kw','setup_cost','subsidy','financing_amount','customer_contribution'])
    const feasibilityFields = new Set(['kseb_consumer_number','kseb_district','kseb_section','transformer','feasibility_status','requested_kw','remaining_transformer_capacity'])
    const hasCalculator = entries.some(([key]) => calculatorFields.has(key))
    const hasFeasibility = entries.some(([key]) => feasibilityFields.has(key))

    const normalized: Record<string, unknown> = {}
    for (const [key, value] of entries) normalized[key] = value

    if (hasCalculator) {
      if (!validPhone(normalized.phone) || !String(normalized.name ?? '').trim() || !String(normalized.district ?? '').trim() || !String(normalized.connection_category ?? '').trim()) {
        return NextResponse.json({ success: false, message: 'Please provide valid calculator details.' }, { status: 400 })
      }
      if (normalized.connection_category !== 'Domestic' && normalized.connection_category !== 'Commercial') {
        return NextResponse.json({ success: false, message: 'Invalid connection category.' }, { status: 400 })
      }
      if (normalized.monthly_kwh !== undefined && normalized.monthly_kwh !== null && (!Number.isFinite(Number(normalized.monthly_kwh)) || Number(normalized.monthly_kwh) <= 0)) {
        return NextResponse.json({ success: false, message: 'Invalid monthly consumption.' }, { status: 400 })
      }
      if (body.privacy_consent !== true) {
        return NextResponse.json({ success: false, message: 'Terms & Privacy Policy consent is required.' }, { status: 400 })
      }
    }

    if (hasFeasibility) {
      if (!/^\d{13}$/.test(String(normalized.kseb_consumer_number ?? ''))) return NextResponse.json({ success: false, message: 'Invalid KSEB Consumer Number.' }, { status: 400 })
      if (!String(normalized.kseb_section ?? '').trim() || !String(normalized.transformer ?? '').trim()) return NextResponse.json({ success: false, message: 'KSEB section and transformer are required.' }, { status: 400 })
    }

    const setParts: string[] = []
    const values: unknown[] = []
    for (const [key, value] of Object.entries(normalized)) {
      if (!/^[a-z_]+$/.test(key)) continue
      setParts.push(`${key} = $${values.length + 1}`)
      values.push(value ?? null)
    }

    if (hasCalculator) {
      setParts.push(`privacy_consent = $${values.length + 1}`)
      values.push(true)
      setParts.push(`privacy_consent_at = NOW()`)
      setParts.push(`terms_version = $${values.length + 1}`)
      values.push(TERMS_VERSION)
      setParts.push(`calculated_at = NOW()`)
      setParts.push(`lead_status = CASE WHEN lead_status = 'NEW' THEN 'CALCULATED' ELSE lead_status END`)
    }
    if (hasFeasibility) {
      setParts.push('feasibility_checked_at = NOW()')
      setParts.push("lead_status = CASE WHEN lead_status IN ('NEW','CALCULATED') THEN 'FEASIBILITY_CHECKED' ELSE lead_status END")
    }

    values.push(leadId)
    const result = await getSql().query(
      `UPDATE leads SET ${setParts.join(', ')}, updated_at = NOW() WHERE lead_id = $${values.length} RETURNING lead_id`,
      values,
    )
    const updatedRows = result as unknown as Record<string, unknown>[]
    if (!updatedRows.length) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    const lead = await getLead(leadId)
    if (lead) {
      const event = hasFeasibility ? 'feasibility' : hasCalculator ? 'calculator' : ''
      if (event) void notifyLeadEvent(event, lead).catch((error) => console.error(`Lead ${event} notifications failed`, error))
    }

    return NextResponse.json({ success: true, leadId })
  } catch (error) {
    console.error('Lead update failed', error)
    return NextResponse.json({ success: false, message: 'Unable to update lead.' }, { status: 500 })
  }
}
