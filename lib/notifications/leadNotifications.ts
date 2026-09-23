import { ensureLeadTable, getSql } from '@/lib/db'
import { syncLeadToGoogleSheet, appendSiteVisitToGoogleSheet } from '@/lib/notifications/googleSheets'
import { sendWhatsAppLeadTemplate } from '@/lib/notifications/whatsapp'

type LeadRecord = Record<string, unknown>

function format(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

async function claimNotification(eventKey: string, channel: string) {
  await ensureLeadTable()
  const rows = await getSql().query(
    "INSERT INTO notification_events (event_key, channel, status, attempts, updated_at) VALUES ($1, $2, 'PROCESSING', 1, NOW()) ON CONFLICT (event_key, channel) DO UPDATE SET status = 'PROCESSING', attempts = notification_events.attempts + 1, updated_at = NOW() WHERE notification_events.status <> 'SENT' RETURNING event_key",
    [eventKey, channel],
  )
  return (rows as unknown as Record<string, unknown>[]).length > 0
}

async function completeNotification(eventKey: string, channel: string) {
  await getSql().query(
    "UPDATE notification_events SET status = 'SENT', last_error = NULL, updated_at = NOW() WHERE event_key = $1 AND channel = $2",
    [eventKey, channel],
  )
}

async function failNotification(eventKey: string, channel: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  await getSql().query(
    "UPDATE notification_events SET status = 'FAILED', last_error = $1, updated_at = NOW() WHERE event_key = $2 AND channel = $3",
    [message.slice(0, 1000), eventKey, channel],
  )
}

function eventMessage(event: string, lead: LeadRecord) {
  const common = [
    `Lead ID: ${format(lead.lead_id)}`,
    `Name: ${format(lead.name)}`,
    `Phone: ${format(lead.phone)}`,
  ]
  const messages: Record<string, string[]> = {
    created: ['NEW LEAD CREATED', ...common],
    calculator: [
      'CALCULATOR COMPLETED', ...common,
      `District: ${format(lead.district)}`,
      `Monthly KWH: ${format(lead.monthly_kwh)}`,
      `Category: ${format(lead.connection_category)}`,
      `Recommended: ${format(lead.recommended_kw)} kW`,
      `Setup Cost: ₹${format(lead.setup_cost)}`,
      `Subsidy: ₹${format(lead.subsidy)}`,
      `Financing: ₹${format(lead.financing_amount)}`,
      `Customer Contribution: ₹${format(lead.customer_contribution)}`,
    ],
    feasibility: [
      'KSEB FEASIBILITY COMPLETED', ...common,
      `Consumer Number: ${format(lead.kseb_consumer_number)}`,
      `KSEB District: ${format(lead.kseb_district)}`,
      `Section: ${format(lead.kseb_section)}`,
      `Transformer: ${format(lead.transformer)}`,
      `Status: ${format(lead.feasibility_status)}`,
      `Requested: ${format(lead.requested_kw)} kW`,
      `Remaining Capacity: ${format(lead.remaining_transformer_capacity)} kW`,
    ],
    documents: ['DOCUMENTS RECEIVED', ...common, 'All four eligibility documents have been uploaded.'],
    site_visit: [
      'SITE VISIT BOOKED', ...common,
      `Date: ${format(lead.preferred_date)}`,
      `Time: ${format(lead.preferred_time)}`,
      `Location: ${format(lead.location)}`,
    ],
  }
  return messages[event]?.join('\n') ?? ''
}

export async function notifyLeadEvent(event: string, lead: LeadRecord) {
  const leadId = format(lead.lead_id)
  const eventKey = `${leadId}:${event.toUpperCase()}`
  const message = eventMessage(event, lead)
  if (!message) throw new Error(`Unknown lead notification event: ${event}`)

  const results = {
    googleSheet: { configured: false, saved: false },
    whatsapp: { configured: false, sent: false },
  }

  if (await claimNotification(eventKey, 'GOOGLE_SHEETS')) {
    try {
      results.googleSheet = await syncLeadToGoogleSheet(lead)
      if (results.googleSheet.saved) await completeNotification(eventKey, 'GOOGLE_SHEETS')
      else if (!results.googleSheet.configured) await failNotification(eventKey, 'GOOGLE_SHEETS', 'Google Sheets integration is not configured.')
    } catch (error) {
      await failNotification(eventKey, 'GOOGLE_SHEETS', error)
      console.error(`Google Sheet ${event} notification failed`, error)
    }
  }

  if (await claimNotification(eventKey, 'WHATSAPP')) {
    try {
      results.whatsapp = await sendWhatsAppLeadTemplate(lead)
      if (results.whatsapp.sent) await completeNotification(eventKey, 'WHATSAPP')
      else if (!results.whatsapp.configured) await failNotification(eventKey, 'WHATSAPP', 'WhatsApp integration is not configured.')
    } catch (error) {
      await failNotification(eventKey, 'WHATSAPP', error)
      console.error(`WhatsApp ${event} notification failed`, error)
    }
  }

  return results
}

export async function notifySiteVisit(lead: LeadRecord) {
  const result = await notifyLeadEvent('site_visit', lead)
  const eventKey = `${format(lead.lead_id)}:SITE_VISIT_SHEET`
  if (await claimNotification(eventKey, 'GOOGLE_SHEETS_SITE_VISIT')) {
    try {
      const siteVisitResult = await appendSiteVisitToGoogleSheet({
        lead_id: lead.lead_id,
        name: lead.name,
        phone: lead.phone,
        preferred_date: lead.preferred_date,
        preferred_time: lead.preferred_time,
        location: lead.location,
        district: lead.district,
        locality: lead.locality,
        area: lead.area,
        latitude: lead.latitude,
        longitude: lead.longitude,
        status: lead.status,
        updated_at: lead.updated_at,
        created_at: lead.created_at,
      })
      if (siteVisitResult.saved) await completeNotification(eventKey, 'GOOGLE_SHEETS_SITE_VISIT')
      else if (!siteVisitResult.configured) await failNotification(eventKey, 'GOOGLE_SHEETS_SITE_VISIT', 'Google Sheets integration is not configured.')
    } catch (error) {
      await failNotification(eventKey, 'GOOGLE_SHEETS_SITE_VISIT', error)
      console.error('Google Sheet site visit append failed', error)
    }
  }
  return result
}
