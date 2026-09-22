import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { verifyLeadToken } from '@/lib/leadAuth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { notifySiteVisit } from '@/lib/notifications/leadNotifications'

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`))
}

export async function POST(request: Request) {
  try {
    const rate = await checkRateLimit(request, 'site-visit', 20, 60)
    if (rate.limited) return rateLimitResponse(rate.retryAfter)

    const body = await request.json()
    const leadId = String(body.leadId ?? '').trim()
    const leadToken = String(body.leadToken ?? '').trim()
    const name = String(body.name ?? '').trim()
    const phone = String(body.phone ?? '').replace(/\D/g, '')
    const date = String(body.date ?? '').trim()
    const time = String(body.time ?? '').trim()
    const location = String(body.location ?? '').trim()

    if (!leadId || !leadToken || !verifyLeadToken(leadId, leadToken)) {
      return NextResponse.json({ success: false, message: 'Invalid or expired lead authorization.' }, { status: 401 })
    }
    if (!name || !/^[6-9]\d{9}$/.test(phone) || !isValidDate(date) || !/^\d{2}:\d{2}$/.test(time) || !location) {
      return NextResponse.json({ success: false, message: 'Please provide valid site visit details.' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)
    if (date < today) return NextResponse.json({ success: false, message: 'Preferred date cannot be in the past.' }, { status: 400 })

    await ensureLeadTable()
    const sql = getSql()
    const leadExists = await sql`SELECT lead_id FROM leads WHERE lead_id = ${leadId} LIMIT 1`
    const leadRows = leadExists as unknown as Record<string, any>[]
    if (!leadRows.length) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })

    await sql.transaction([
      sql`
        INSERT INTO site_visits (lead_id, name, phone, preferred_date, preferred_time, location, status, created_at, updated_at)
        VALUES (${leadId}, ${name}, ${phone}, ${date}, ${time}, ${location}, 'BOOKED', NOW(), NOW())
        ON CONFLICT (lead_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          preferred_date = EXCLUDED.preferred_date,
          preferred_time = EXCLUDED.preferred_time,
          location = EXCLUDED.location,
          status = 'BOOKED',
          updated_at = NOW()
      `,
      sql`UPDATE leads SET updated_at = NOW() WHERE lead_id = ${leadId}`,
    ])

    const mergedRows = await sql`
      SELECT
        l.*,
        sv.name AS site_visit_name,
        sv.phone AS site_visit_phone,
        sv.preferred_date,
        sv.preferred_time,
        sv.location AS site_visit_location,
        sv.status AS site_visit_status,
        sv.created_at AS site_visit_created_at,
        sv.updated_at AS site_visit_updated_at
      FROM leads l
      JOIN site_visits sv ON sv.lead_id = l.lead_id
      WHERE l.lead_id = ${leadId}
      LIMIT 1
    `
    const lead = (mergedRows as unknown as Record<string, unknown>[])[0]
    if (lead) {
      void notifySiteVisit({
        ...lead,
        name: lead.site_visit_name,
        phone: lead.site_visit_phone,
        preferred_date: lead.preferred_date,
        preferred_time: lead.preferred_time,
        location: lead.site_visit_location,
        status: lead.site_visit_status,
        created_at: lead.site_visit_created_at,
        updated_at: lead.site_visit_updated_at,
      }).catch((error) => console.error('Site visit notifications failed', error))
    }

    return NextResponse.json({ success: true, message: 'Site visit request received. Our executive will contact you soon.' })
  } catch (error) {
    console.error('Site visit booking failed', error)
    return NextResponse.json({ success: false, message: 'Unable to book the site visit right now.' }, { status: 500 })
  }
}
