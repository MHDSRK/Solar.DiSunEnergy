import { normalizeTransformer, type TransformerRecord } from './feasibilityEngine.ts'

const BASE = 'https://wss.kseb.in/selfservices/'
let lastSuccessfulFetch: string | null = null
let lastError: string | null = null

async function post(path: string, params?: Record<string, string>) {
  const response = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: params ? new URLSearchParams(params) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`KSEB_HTTP_${response.status}`)
  return response.json() as Promise<Record<string, unknown>>
}

export async function getKsebDistricts() {
  const districts = await post('getDistricts')
  return Object.entries(districts).map(([name, id]) => ({ id: String(id), name }))
}

export async function getKsebSections(districtId: string) {
  const sections = await post('getinputSection', { distictid: districtId })
  return Object.entries(sections).map(([name, id]) => ({ id: String(id), name }))
}

type KsebSection = { sectionId: string; name: string; districtId: string; districtName: string }

const SECTION_CACHE_TTL_MS = 5 * 60 * 1000
const SECTION_FETCH_CONCURRENCY = 4
let sectionCache: { expiresAt: number; sections: KsebSection[] } | null = null
let sectionFetch: Promise<KsebSection[]> | null = null

async function getSections() {
  if (sectionCache && sectionCache.expiresAt > Date.now()) return sectionCache.sections
  if (sectionFetch) return sectionFetch

  sectionFetch = (async () => {
    const districts = await post('getDistricts')
    const entries = Object.entries(districts)
    const output: KsebSection[] = []
    let nextIndex = 0

    async function fetchNextDistrict() {
      while (nextIndex < entries.length) {
        const currentIndex = nextIndex++
        const [districtName, districtId] = entries[currentIndex]
        const sections = await post('getinputSection', { distictid: String(districtId) })
        for (const [name, sectionId] of Object.entries(sections)) {
          output.push({ sectionId: String(sectionId), name, districtId: String(districtId), districtName })
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(SECTION_FETCH_CONCURRENCY, entries.length) }, () => fetchNextDistrict()),
    )

    sectionCache = { expiresAt: Date.now() + SECTION_CACHE_TTL_MS, sections: output }
    return output
  })()

  try {
    return await sectionFetch
  } finally {
    sectionFetch = null
  }
}

export async function resolveKsebSection(input: { sectionId?: string; sectionOffice?: string; districtId?: string; districtName?: string }) {
  const sections = await getSections()

  if (input.sectionId) {
    const authoritative = sections.find((section) => String(section.sectionId) === String(input.sectionId))
    if (!authoritative) return null
    return authoritative
  }

  const query = input.sectionOffice?.trim().toLocaleLowerCase()
  if (!query) return null
  const simplifiedQuery = query.replace(/\s+electrical\s+section\s*$/i, '').trim()
  return sections.find((section) => {
    const name = section.name.toLocaleLowerCase()
    const simplifiedName = name.replace(/\s*\[[^\]]+\]\s*$/, '').trim()
    return name === query || name.includes(query) || simplifiedName === query || simplifiedName === simplifiedQuery || simplifiedName.includes(simplifiedQuery)
  }) ?? null
}

export async function fetchKsebRecap({ sectionId }: { sectionId: string }) {
  try {
    const payload = await post('getDTRAvailable', { sectionId })
    if (Number(payload.err_flag) !== 0 || !Array.isArray(payload.list)) throw new Error('KSEB_MALFORMED_RESPONSE')
    const records = payload.list.map((item) => normalizeTransformer(item as Record<string, unknown>)).filter((item): item is TransformerRecord => Boolean(item))
    if (!records.length) throw new Error('KSEB_EMPTY_RESPONSE')
    lastSuccessfulFetch = new Date().toISOString(); lastError = null
    return { records, checkedAt: String(payload.ason ?? lastSuccessfulFetch), retrievedAt: lastSuccessfulFetch, office: payload.office as Record<string, unknown> | undefined }
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'KSEB_UNKNOWN_ERROR'
    throw error
  }
}

export function getKsebHealth() { return { provider: process.env.KSEB_PROVIDER ?? 'kseb', ksebReachable: Boolean(lastSuccessfulFetch && !lastError), lastSuccessfulFetch, lastError } }
