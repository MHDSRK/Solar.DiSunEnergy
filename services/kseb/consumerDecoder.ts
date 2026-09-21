import { findSectionByCode } from './sectionRegistry'

export function normalizeConsumerNumber(value: string) {
  return value.replace(/[\s-]/g, '')
}

export function decodeKsebConsumerNumber(value: string) {
  const consumerNumber = normalizeConsumerNumber(value)
  if (!/^\d{13}$/.test(consumerNumber)) return { valid: false as const, reason: 'INVALID_CONSUMER_NUMBER' as const }

  // KSEB's published format documents a four-digit section-code component.
  // The component is the leading four digits; no arithmetic inference is used.
  const sectionCode = consumerNumber.slice(0, 4)
  const section = findSectionByCode(sectionCode)
  if (!section) return { valid: false as const, reason: 'SECTION_CODE_UNRESOLVED' as const, consumerNumber, sectionCode }

  return { valid: true as const, consumerNumber, sectionCode, sectionName: section.sectionName, district: section.district, mappingStatus: 'SOURCE_REFERENCE' as const }
}
