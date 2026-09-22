import { NextResponse } from 'next/server'
import { ensureLeadTable, getSql } from '@/lib/db'
import { verifyLeadToken } from '@/lib/leadAuth'
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit'
import { notifySiteVisit } from '@/lib/notifications/leadNotifications'
import { parseLocation, validateSiteVisitSlot } from '@/lib/siteVisitRules'

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

    const slotErrors = validateSiteVisitSlot(date, time)
    if (slotErrors.length) return NextResponse.json({ success: false, message: slotErrors[0], errors: slotErrors }, { status: 400 })

    await ensureLeadTable()
    const sql = getSql()
    const leadRows = await sql`SELECT * FROM leads WHERE lead_id = ${leadId} LIMIT 1`
    const lead = (leadRows as unknown as Record<string, unknown>[])[0]
    if (!lead) return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })
    if (lead.privacy_consent !== true) return NextResponse.json({ success: false, message: 'Terms & Privacy Policy consent is required.' }, { status: 400 })

    const locationParts = parseLocation(location)
    const district = String(lead.district ?? '').trim() || null
    const area = String(lead.area ?? '').trim() || null

    const duplicateRows = await sql`
      SELECT lead_id FROM site_visits
      WHERE phone = ${phone} AND preferred_date = ${date} AND preferred_time = ${time}
      AND lead_id <> ${leadId}
      LIMIT 1
    `
    if ((duplicateRows as unknown as unknown[]).length) {
      return NextResponse.json({ success: false, message: 'This time slot is already booked. Please choose another time.' }, { status: 409 })
    }

    await sql.transaction([
      sql`
        INSERT INTO site_visits (
          lead_id, name, phone, preferred_date, preferred_time, location,
          district, locality, area, latitude, longitude, status, created_at, updated_at
        )
        VALUES (
          ${leadId}, ${name}, ${phone}, ${date}, ${time}, ${location},
          ${district}, NULL, ${area}, ${locationParts.latitude}, ${locationParts.longitude},
          'BOOKED', NOW(), NOW()
        )
        ON CONFLICT (lead_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          preferred_date = EXCLUDED.preferred_date,
          preferred_time = EXCLUDED.preferred_time,
          location = EXCLUDED.location,
          district = EXCLUDED.district,
          locality = EXCLUDED.locality,
          area = EXCLUDED.area,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          status = 'BOOKED',
          updated_at = NOW()
      `,
      sql`
        UPDATE leads
        SET updated_at = NOW(), site_visit_booked_at = NOW(),
            lead_status = CASE WHEN lead_status NOT IN ('CONVERTED','CANCELLED') THEN 'SITE_VISIT_BOOKED' ELSE lead_status END
        WHERE lead_id = ${leadId}
      `,
    ])

    const mergedRows = await sql`
      SELECT l.*,
        sv.name AS site_visit_name, sv.phone AS site_visit_phone,
        sv.preferred_date, sv.preferred_time, sv.location AS site_visit_location,
        sv.district AS site_visit_district, sv.locality AS site_visit_locality,
        sv.area AS site_visit_area, sv.latitude, sv.longitude,
        sv.status AS site_visit_status, sv.created_at AS site_visit_created_at,
        sv.updated_at AS site_visit_updated_at
      FROM leads l
      JOIN site_visits sv ON sv.lead_id = l.lead_id
      WHERE l.lead_id = ${leadId}
      LIMIT 1
    `
    const merged = (mergedRows as unknown as Record<string, unknown>[])[0]
    if (merged) {
      void notifySiteVisit({
        ...merged,
        name: merged.site_visit_name,
        phone: merged.site_visit_phone,
        preferred_date: merged.preferred_date,
        preferred_time: merged.preferred_time,
        location: merged.site_visit_location,
        district: merged.site_visit_district,
        locality: merged.site_visit_locality,
        area: merged.site_visit_area,
        latitude: merged.latitude,
        longitude: merged.longitude,
        status: merged.site_visit_status,
        created_at: merged.site_visit_created_at,
        updated_at: merged.site_visit_updated_at,
      }).catch((error) => console.error('Site visit notifications failed', error))
    }

    return NextResponse.json({ success: true, message: 'Site visit request received. Our executive will contact you soon.' })
  } catch (error) {
    const message = error instanceof Error && /site_visits_slot_unique|duplicate key/i.test(error.message)
      ? 'This time slot is already booked. Please choose another time.'
      : 'Unable to book the site visit right now.'
    console.error('Site visit booking failed', error)
    return NextResponse.json({ success: false, message }, { status: message.startsWith('This time slot') ? 409 : 500 })
  }
}
