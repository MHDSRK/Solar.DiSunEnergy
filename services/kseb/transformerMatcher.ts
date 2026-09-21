import type { TransformerRecord } from './feasibilityEngine'

export function normalizeLocationText(value: string) {
  return value.toLocaleLowerCase().normalize('NFKC').replace(/[.,/\\-]+/g, ' ').replace(/\b(junction|jn)\b/g, 'jn').replace(/\b(road|rd)\b/g, 'rd').replace(/\s+/g, ' ').trim()
}

export function matchTransformers(records: TransformerRecord[], area = '', transformerName = '') {
  const query = normalizeLocationText(transformerName || area)
  if (!query) return { status: 'MULTIPLE_MATCHES' as const, matches: records }
  const tokens = query.split(' ').filter((token) => token.length > 2)
  const scored = records.map((record) => {
    const name = normalizeLocationText(record.transformerName)
    const feeder = normalizeLocationText(record.feederName)
    if (transformerName && name === query) return { record, score: 100 }
    const nameHits = tokens.filter((token) => name.includes(token)).length
    const feederHits = tokens.filter((token) => feeder.includes(token)).length
    return { record, score: nameHits === tokens.length && tokens.length ? 90 : nameHits ? 70 : feederHits === tokens.length && tokens.length ? 60 : feederHits ? 40 : 0 }
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)
  if (!scored.length) return { status: 'NO_MATCH' as const, matches: records }
  const top = scored.filter((item) => item.score === scored[0].score).map((item) => item.record)
  if (top.length > 1 || scored[0].score < 60) return { status: 'MULTIPLE_MATCHES' as const, matches: top }
  return { status: 'MATCH' as const, record: scored[0].record, matches: top }
}
