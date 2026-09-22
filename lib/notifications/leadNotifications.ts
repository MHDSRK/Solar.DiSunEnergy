import { syncLeadToGoogleSheet } from '@/lib/notifications/googleSheets'
import { sendWhatsAppText } from '@/lib/notifications/whatsapp'

type LeadRecord = Record<string, unknown>

function format(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

export async function notifyLeadEvent(event: string, lead: LeadRecord) {
  const leadId = format(lead.lead_id)
  const common = [
    `Lead ID: ${leadId}`,
    `Name: ${format(lead.name)}`,
    `Phone: ${format(lead.phone)}`,
  ]

  const messages: Record<string, string[]> = {
    created: ['NEW LEAD CREATED', ...common],
    calculator: [
      'CALCULATOR COMPLETED',
      ...common,
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
      'KSEB FEASIBILITY COMPLETED',
      ...common,
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
      'SITE VISIT BOOKED',
      ...common,
      `Date: ${format(lead.preferred_date)}`,
      `Time: ${format(lead.preferred_time)}`,
      `Location: ${format(lead.location)}`,
    ],
  }

  const lines = messages[event]
  if (!lines) throw new Error(`Unknown lead notification event: ${event}`)

  const [sheet, whatsapp] = await Promise.allSettled([
    syncLeadToGoogleSheet(lead),
    sendWhatsAppText(lines.join('\n')),
  ])

  if (sheet.status === 'rejected') console.error(`Google Sheet ${event} notification failed`, sheet.reason)
  if (whatsapp.status === 'rejected') console.error(`WhatsApp ${event} notification failed`, whatsapp.reason)

  return {
    googleSheet: sheet.status === 'fulfilled' ? sheet.value : { configured: true, saved: false },
    whatsapp: whatsapp.status === 'fulfilled' ? whatsapp.value : { configured: true, sent: false },
  }
}

export async function notifySiteVisit(lead: LeadRecord) {
  const result = await notifyLeadEvent('site_visit', lead)
  const siteVisit = {
    lead_id: lead.lead_id,
    name: lead.name,
    phone: lead.phone,
    preferred_date: lead.preferred_date,
    preferred_time: lead.preferred_time,
    location: lead.location,
    status: lead.status,
    updated_at: lead.updated_at,
    created_at: lead.created_at,
  }
  try {
    await import('@/lib/notifications/googleSheets').then(({ appendSiteVisitToGoogleSheet }) => appendSiteVisitToGoogleSheet(siteVisit))
  } catch (error) {
    console.error('Google Sheet site visit append failed', error)
  }
  return result
}
