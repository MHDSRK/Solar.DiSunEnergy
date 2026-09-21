import type { TransformerRecord } from './feasibilityEngine'

export function normalizeLocationText(value: string) {
  return value.toLowerCase().replace(/[.,/\\-]+/g, ' ').replace(/\b(junction|jn)\b/g, 'jn').replace(/\b(road|rd)\b/g, 'rd').replace(/\b(street|st)\b/g, 'st').replace(/\s+/g, ' ').trim()
}

export function matchTransformers(records: TransformerRecord[], area: string, transformerName?: string) {
  const requested = normalizeLocationText(transformerName || area)
  const tokens = requested.split(' ').filter((token) => token.length > 2)
  const scored = records.map((record) => {
    const name = normalizeLocationText(record.transformerName)
    const exact = transformerName && name === requested ? 100 : 0
    const matched = tokens.filter((token) => name.includes(token)).length
    return { record, score: exact || (matched === tokens.length && tokens.length > 0 ? 90 : matched > 0 ? 60 : 0) }
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)
  if (!scored.length) return { status: 'NO_MATCH' as const, matches: [] }
  if (scored.length > 1 && scored[0].score === scored[1].score) return { status: 'MULTIPLE_MATCHES' as const, matches: scored.map((item) => item.record) }
  return { status: 'MATCH' as const, record: scored[0].record, matches: [scored[0].record] }
}
