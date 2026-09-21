import { normalizeTransformer, type TransformerRecord } from './feasibilityEngine'

const KSEB_BASE = 'https://wss.kseb.in/selfservices/'
let lastSuccessfulFetch: string | null = null
let lastError: string | null = null

async function request(path: string, body?: URLSearchParams) {
  const response = await fetch(`${KSEB_BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body, cache: 'no-store', signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`KSEB_${response.status}`)
  return response.json()
}

export async function fetchKsebRecap({ district, section }: { district: string; section: string }) {
  try {
    const districts = await request('reCap/getDistricts')
    const districtId = Object.entries(districts as Record<string, string>).find(([name]) => name.trim().toLowerCase() === district.trim().toLowerCase())?.[1]
    if (!districtId) throw new Error('KSEB_DISTRICT_NOT_FOUND')
    const sections = await request('reCap/getinputSection', new URLSearchParams({ distictid: String(districtId) }))
    const sectionId = Object.entries(sections as Record<string, string>).find(([name]) => name.trim().toLowerCase() === section.trim().toLowerCase())?.[1]
    if (!sectionId) throw new Error('KSEB_SECTION_NOT_FOUND')
    const payload = await request('reCap/getDTRAvailable', new URLSearchParams({ sectionId: String(sectionId) }))
    if (payload?.err_flag !== 0 || !Array.isArray(payload?.list)) throw new Error('KSEB_EMPTY_OR_MALFORMED_RESPONSE')
    const records = payload.list.map((item: Record<string, unknown>) => normalizeTransformer(item)) as TransformerRecord[]
    lastSuccessfulFetch = new Date().toISOString(); lastError = null
    return { records, checkedAt: lastSuccessfulFetch }
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'KSEB_UNKNOWN_ERROR'
    throw error
  }
}

export function getKsebHealth() { return { provider: process.env.KSEB_PROVIDER ?? 'kseb', ksebReachable: Boolean(lastSuccessfulFetch && !lastError), lastSuccessfulFetch, lastError } }
