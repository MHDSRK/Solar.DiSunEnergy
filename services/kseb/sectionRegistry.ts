export type KsebSection = {
  sectionCode: string
  sectionName: string
  district?: string
  source: 'KSEB_OFFICIAL_SECTION_CODE_REFERENCE'
  sourceDate: string
  validationStatus: 'SOURCE_REFERENCE'
  active: boolean
}

export const KSEB_SECTION_SOURCE = 'https://old.kseb.in/index.php?Itemid=674&catid=3&id=3318&lang=en&m=0&option=com_jdownloads&task=download.send'

// Imported records are intentionally marked as source references, not a complete current registry.
const records: KsebSection[] = [
  ['5617', 'Adimali', 'Idukki'], ['4609', 'Adoor', 'Pathanamthitta'], ['6516', 'Agali', 'Palakkad'],
  ['5501', 'Alappuzha (North)', 'Alappuzha'], ['5502', 'Alappuzha (Town)', 'Alappuzha'], ['5503', 'Alappuzha (South)', 'Alappuzha'],
  ['5568', 'Aluva North', 'Ernakulam'], ['5567', 'Aluva Town', 'Ernakulam'], ['5569', 'Aluva West', 'Ernakulam'],
  ['5579', 'Angamaly', 'Ernakulam'], ['5540', 'College, Ernakulam', 'Ernakulam'], ['5544', 'Edappally', 'Ernakulam'],
  ['5546', 'Ernakulam Central', 'Ernakulam'], ['5675', 'Mannuthy', 'Thrissur'], ['5539', 'Mannar', 'Alappuzha'],
  ['5509', 'Mancombu', 'Alappuzha'], ['6654', 'Kannur', 'Kannur'], ['6688', 'Kasaragod', 'Kasaragod'],
  ['6555', 'Malappuram', 'Malappuram'], ['6533', 'Ottappalam', 'Palakkad'],
  ['5635', 'Pampady', 'Kottayam'], ['5624', 'Pala', 'Kottayam'], ['5522', 'Mavelikkara', 'Alappuzha'],
].map(([sectionCode, sectionName, district]) => ({ sectionCode, sectionName, district, source: 'KSEB_OFFICIAL_SECTION_CODE_REFERENCE', sourceDate: 'UNKNOWN', validationStatus: 'SOURCE_REFERENCE', active: true }))

export const sectionRegistry = new Map(records.map((record) => [record.sectionCode, record]))
export const sectionRegistryCount = sectionRegistry.size
export function findSectionByCode(sectionCode: string) { return sectionRegistry.get(sectionCode) }
export function findSectionByName(name: string) { return records.find((record) => record.sectionName.toLowerCase() === name.trim().toLowerCase()) }
export function listSections() { return records.filter((record) => record.active) }

export const SECTION_REGISTRY_NOTE = 'This local registry contains imported KSEB source-reference records and is not asserted to be complete or current for 2026.'
