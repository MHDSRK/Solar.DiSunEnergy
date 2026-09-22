export type LeadEventType = 'CREATED' | 'CALCULATED' | 'FEASIBILITY_CHECKED' | 'DOCUMENTS_COMPLETED' | 'SITE_VISIT_BOOKED'

export function eventKey(leadId: string, eventType: LeadEventType) {
  return `${leadId}:${eventType}`
}
